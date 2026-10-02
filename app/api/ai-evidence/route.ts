import { NextResponse } from "next/server";
import { requireRole, getSession } from "../../../lib/auth";
import { runEvidence, type EvidenceStore } from "../../../lib/ai-evidence";
import { HttpJevAdapter, HttpLlmAdapter } from "../../../lib/http-adapters";
import { appraisalAnswers, listCurrentEvidence, markEvidenceCurrent, retireCurrentEvidence, saveEvidence, saveFailure, saveJev, saveSummary } from "../../../lib/evidence-store";
import { getSettings } from "../../../lib/settings";
import { assessAppraisal, saveAppraisalJev } from "../../../lib/appraisal-jev";
import { activeRun, finishRun, getRun, tryStartRun } from "../../../lib/run-registry";

const appraisalId = "appraisal-001";

const store: EvidenceStore = {
  async saveJev(input) { await saveJev({ answerId: input.answerId, result: input.result }); },
  async saveEvidence(input) { await saveEvidence(input); },
  async saveSummary(input) { await saveSummary(input); },
  async saveFailure(input) { await saveFailure({ answerId: input.answerId, stage: input.stage, error: input.error }); },
};

export async function GET(request: Request) {
  try { requireRole(await getSession(), "manager"); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  const runId = new URL(request.url).searchParams.get("runId") ?? "";
  const run = getRun(appraisalId, runId);
  if (!run) return NextResponse.json({ error: "Unknown runId" }, { status: 404 });
  return NextResponse.json({ runId: run.id, status: run.status, result: run.result ?? null });
}

export async function POST(request: Request) {
  try {
    requireRole(await getSession(), "manager");
    const settings = await getSettings();
    if (!settings?.llmBaseUrl || !settings.jevBaseUrl) return NextResponse.json({ error: "Model settings incomplete — set LLM and Jev base URLs on the Settings page first." }, { status: 400 });
    let requestedId = "";
    try { const body = await request.json(); if (body && typeof body === "object" && "runId" in body && typeof (body as { runId?: unknown }).runId === "string") requestedId = (body as { runId: string }).runId; } catch { /* empty body allowed */ }
    const runId = requestedId || `run-${Date.now()}`;
    const existing = getRun(appraisalId, runId);
    if (existing) return NextResponse.json({ runId, status: existing.status, result: existing.result ?? null, deduplicated: true });
    const start = tryStartRun(appraisalId, runId);
    if (!start.started) return NextResponse.json({ error: start.reason === "active_run" ? "A run is already active for this appraisal" : "Duplicate runId", activeRunId: start.existing.id }, { status: 409 });

    const answers = await appraisalAnswers(appraisalId);
    if (!answers.length) { finishRun(appraisalId, runId, "failed", "No answers"); return NextResponse.json({ error: "No answers with text found for this appraisal" }, { status: 400 }); }
    const jev = new HttpJevAdapter(settings.jevBaseUrl);
    const llm = settings.jevBaseUrl === settings.llmBaseUrl ? new HttpLlmAdapter() : undefined;
    const results: unknown[] = [];
    for (const answer of answers) {
      const result = await runEvidence({ answerId: answer.id, sourceText: answer.text, jev, llm, store });
      if (result.ok && result.llm?.evidence.length) {
        await retireCurrentEvidence(answer.id);
        await markEvidenceCurrent(answer.id, result.llm.evidence.map(e => e.evidenceId));
      }
      results.push(result.ok ? { answerId: answer.id, ok: true, jev: result.jev, evidence: result.llm?.evidence.length ?? 0, insufficient: result.insufficient ?? false } : { answerId: answer.id, ok: false, stage: result.stage, error: result.error });
    }
    const currentEvidence = await listCurrentEvidence(appraisalId);
    let appraisalJev: unknown = null;
    try {
      appraisalJev = await assessAppraisal({ statements: currentEvidence.map(e => ({ evidenceId: e.id, quote: e.quote, classification: e.classification })), competency: "problem solving" });
      await saveAppraisalJev({ appraisalId, result: appraisalJev as never });
    } catch (error) { appraisalJev = { error: (error as Error).message }; }
    const payload = { ok: true, ran: results.length, results, appraisalJev };
    finishRun(appraisalId, runId, "done", payload);
    return NextResponse.json({ runId, ...payload });
  } catch (error) {
    const message = (error as Error).message;
    return NextResponse.json({ error: message === "FORBIDDEN" ? "Forbidden" : message }, { status: message === "FORBIDDEN" ? 403 : 502 });
  }
}

import { getSettings, type ModelSettings } from "./settings";

export type EvidenceClassification = "support" | "contradiction";
export type JevDecision = {
  relevant: boolean;
  sufficient: boolean;
  classification: EvidenceClassification;
  probability: number;
  rating: 1 | 2 | 3 | 4 | 5;
  model?: string;
  version?: string;
  questionSetVersion: string;
};
export type LlmEvidence = { answerId: string; quote: string; summary: string; evidenceId: string };
export type LlmResult = { summary: string; evidence: LlmEvidence[]; citedEvidenceIds: string[] };
export type ModelFailure = { ok: false; stage: "jev" | "llm"; error: string };
export type ModelSuccess = { ok: true; jev: JevDecision; llm?: LlmResult; insufficient?: boolean };
export type EvidenceRunResult = ModelFailure | ModelSuccess;

export interface JevAdapter {
  assess(input: { answerId: string; sourceText: string }): Promise<unknown>;
}
export interface LlmAdapter {
  summarize(input: { answerId: string; sourceText: string; jev: JevDecision }): Promise<unknown>;
}
export interface EvidenceStore {
  saveJev(input: { answerId: string; result: JevDecision }): Promise<void>;
  saveEvidence(input: { evidenceId: string; answerId: string; quote: string; classification: EvidenceClassification; sourceText: string }): Promise<void>;
  saveSummary(input: { answerId: string; summary: string; citedEvidenceIds: string[] }): Promise<void>;
  saveFailure(input: ModelFailure & { answerId: string }): Promise<void>;
}

export function exactQuote(sourceText: string, quote: unknown): quote is string {
  return typeof quote === "string" && quote.length > 0 && sourceText.includes(quote);
}

export function validateJev(value: unknown): JevDecision {
  if (!value || typeof value !== "object") throw new Error("Invalid Jev response");
  const v = value as Record<string, unknown>;
  if (typeof v.relevant !== "boolean" || typeof v.sufficient !== "boolean") throw new Error("Invalid Jev response");
  if (v.classification !== "support" && v.classification !== "contradiction") throw new Error("Invalid Jev response");
  if (typeof v.probability !== "number" || v.probability < 0 || v.probability > 1) throw new Error("Invalid Jev response");
  if (!Number.isInteger(v.rating) || typeof v.rating !== "number" || v.rating < 1 || v.rating > 5) throw new Error("Invalid Jev response");
  if (typeof v.questionSetVersion !== "string" || !v.questionSetVersion) throw new Error("Invalid Jev response");
  return v as unknown as JevDecision;
}

export function validateLlm(value: unknown, sourceText: string, jev: JevDecision): LlmResult {
  if (!value || typeof value !== "object") throw new Error("Invalid LLM response");
  const v = value as Record<string, unknown>;
  if (typeof v.summary !== "string" || !Array.isArray(v.evidence) || !Array.isArray(v.citedEvidenceIds)) throw new Error("Invalid LLM response");
  const evidence = v.evidence.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Invalid LLM response");
    const e = item as Record<string, unknown>;
    if (typeof e.answerId !== "string" || typeof e.evidenceId !== "string" || !exactQuote(sourceText, e.quote) || typeof e.summary !== "string") throw new Error("Invalid evidence quote");
    return e as unknown as LlmEvidence;
  });
  if (!jev.sufficient && evidence.length) throw new Error("Insufficient evidence");
  if (v.citedEvidenceIds.some((id) => typeof id !== "string" || !evidence.some((e) => e.evidenceId === id))) throw new Error("Invalid evidence citation");
  return { summary: v.summary, evidence, citedEvidenceIds: v.citedEvidenceIds as string[] };
}

export async function runEvidence(input: { answerId: string; sourceText: string; jev: JevAdapter; llm?: LlmAdapter; store: EvidenceStore }): Promise<EvidenceRunResult> {
  let decision: JevDecision;
  try { decision = validateJev(await input.jev.assess({ answerId: input.answerId, sourceText: input.sourceText })); }
  catch (error) { const failure: ModelFailure & { answerId: string } = { ok: false, stage: "jev", error: error instanceof Error ? error.message : "Jev unavailable", answerId: input.answerId }; await input.store.saveFailure(failure); return failure; }
  await input.store.saveJev({ answerId: input.answerId, result: decision });
  if (!input.llm || !decision.relevant) return { ok: true, jev: decision };
  if (!decision.sufficient) return { ok: true, jev: decision, insufficient: true };
  try {
    const llm = validateLlm(await input.llm.summarize({ answerId: input.answerId, sourceText: input.sourceText, jev: decision }), input.sourceText, decision);
    for (const evidence of llm.evidence) await input.store.saveEvidence({ evidenceId: evidence.evidenceId, answerId: input.answerId, quote: evidence.quote, classification: decision.classification, sourceText: input.sourceText });
    await input.store.saveSummary({ answerId: input.answerId, summary: llm.summary, citedEvidenceIds: llm.citedEvidenceIds });
    return { ok: true, jev: decision, llm };
  } catch (error) { const failure: ModelFailure & { answerId: string } = { ok: false, stage: "llm", error: error instanceof Error ? error.message : "LLM unavailable", answerId: input.answerId }; await input.store.saveFailure(failure); return failure; }
}

export async function adapterConfig(): Promise<Pick<ModelSettings, "llmBaseUrl" | "jevBaseUrl">> {
  const settings = await getSettings();
  if (!settings) throw new Error("Model settings unavailable");
  return { llmBaseUrl: settings.llmBaseUrl, jevBaseUrl: settings.jevBaseUrl };
}

export function followUpAllowed(previousFollowUps: number, sufficient: boolean): boolean {
  return !sufficient && previousFollowUps < 1;
}

export class MockJevAdapter implements JevAdapter {
  constructor(private readonly result: unknown) {}
  async assess(): Promise<unknown> { return this.result; }
}
export class MockLlmAdapter implements LlmAdapter {
  constructor(private readonly result: unknown) {}
  async summarize(): Promise<unknown> { return this.result; }
}

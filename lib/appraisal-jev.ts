import neo4j from "neo4j-driver";
import { getSettings } from "./settings";

export type AppraisalJev = { relevant: boolean; sufficient: boolean; classification: "support" | "contradiction"; probability: number; rating: 1 | 2 | 3 | 4 | 5; questionSetVersion: string };

const APPRAISAL_PROMPT = { role: "system" as const, content: `You are Jev, an appraisal-level evidence assessor. Given a package of extracted evidence statements about one employee's competency, decide: (1) is the evidence package sufficient to rate the competency, (2) overall stance support|contradiction, (3) a proposed rubric rating 1-5. Respond with ONLY minified JSON, no markdown, no extra keys, exactly: {"relevant":boolean,"sufficient":boolean,"classification":"support"|"contradiction","probability":number 0..1,"rating":1|2|3|4|5,"questionSetVersion":"v1"}. Do not average per-reviewer opinions; judge the package as a whole.` };

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Model returned no JSON object");
  return JSON.parse(cleaned.slice(start, end + 1)) as unknown;
}

export async function assessAppraisal(input: { statements: { evidenceId: string; quote: string; classification: string }[]; competency: string }): Promise<AppraisalJev> {
  const settings = await getSettings();
  if (!settings?.llmBaseUrl || !settings.llmApiKey) throw new Error("LLM not configured");
  const body = input.statements.length
    ? input.statements.map((s) => `- [${s.classification}] ${s.quote}`).join("\n")
    : "(no evidence statements available)";
  const response = await fetch(`${settings.llmBaseUrl}/chat/completions`, {
    method: "POST",
    headers: { "authorization": `Bearer ${settings.llmApiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ model: settings.llmModel ?? "hermes-vps", messages: [APPRAISAL_PROMPT, { role: "user", content: `Competency: ${input.competency}\nEvidence package:\n${body}` }], max_tokens: 300, stream: true }),
  });
  if (!response.ok || !response.body) throw new Error(`Jev appraisal request returned ${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split("\n")) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const parsedChunk: unknown = JSON.parse(payload);
        if (parsedChunk && typeof parsedChunk === "object" && "choices" in parsedChunk) {
          const choices = (parsedChunk as { choices?: unknown }).choices;
          if (Array.isArray(choices) && choices.length > 0 && choices[0] && typeof choices[0] === "object" && "delta" in choices[0]) {
            const delta = (choices[0] as { delta?: unknown }).delta;
            if (delta && typeof delta === "object" && "content" in delta && typeof (delta as { content?: unknown }).content === "string") {
              full += (delta as { content: string }).content;
            }
          }
        }
      } catch { /* partial SSE line, skip */ }
    }
  }
  const parsed = extractJson(full) as Record<string, unknown>;
  if (typeof parsed.relevant !== "boolean" || typeof parsed.sufficient !== "boolean" || (parsed.classification !== "support" && parsed.classification !== "contradiction") || typeof parsed.probability !== "number" || !Number.isInteger(parsed.rating) || (parsed.rating as number) < 1 || (parsed.rating as number) > 5) throw new Error("Invalid appraisal Jev response");
  return parsed as unknown as AppraisalJev;
}

export async function saveAppraisalJev(input: { appraisalId: string; result: AppraisalJev }): Promise<void> {
  const driver = neo4j.driver(process.env.NEO4J_URI ?? "bolt://127.0.0.1:7687", neo4j.auth.basic(process.env.NEO4J_USER ?? "neo4j", process.env.NEO4J_PASSWORD ?? "neo4j"));
  const session = driver.session();
  try {
    await session.run("MATCH (ap:Appraisal {id:$id}) MERGE (p:JevProposal {id:'jev-proposal:'+ap.id}) SET p += $props, p.createdAt=datetime() MERGE (ap)-[:HAS_PROPOSAL]->(p)", { id: input.appraisalId, props: JSON.parse(JSON.stringify(input.result)) });
  } finally { await session.close(); await driver.close(); }
}

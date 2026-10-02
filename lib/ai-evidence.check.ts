import { MockJevAdapter, MockLlmAdapter, followUpAllowed, runEvidence } from "./ai-evidence";

async function main() {
  const validJev = { relevant: true, sufficient: true, classification: "support" as const, probability: 0.9, rating: 4 as const, questionSetVersion: "q1" };
  const saved: string[] = [];
  const store = { async saveJev() { saved.push("jev"); }, async saveEvidence() { saved.push("evidence"); }, async saveSummary() { saved.push("summary"); }, async saveFailure() { saved.push("failure"); } };
  const valid = await runEvidence({ answerId: "a1", sourceText: "Root cause found", jev: new MockJevAdapter(validJev), llm: new MockLlmAdapter({ summary: "Root cause", evidence: [{ answerId: "a1", evidenceId: "e1", quote: "Root cause", summary: "quote" }], citedEvidenceIds: ["e1"] }), store });
  if (!valid.ok || saved.join(",") !== "jev,evidence,summary") throw new Error("valid evidence assertion failed");
  const invalid = await runEvidence({ answerId: "a2", sourceText: "Source", jev: new MockJevAdapter(validJev), llm: new MockLlmAdapter({ summary: "bad", evidence: [{ answerId: "a2", evidenceId: "e2", quote: "not in source", summary: "bad" }], citedEvidenceIds: ["e2"] }), store });
  if (invalid.ok || invalid.stage !== "llm") throw new Error("invalid quote assertion failed");
  const badJev = await runEvidence({ answerId: "a3", sourceText: "Source", jev: new MockJevAdapter({}), store });
  if (badJev.ok || badJev.stage !== "jev") throw new Error("invalid model assertion failed");
  const insufficient = await runEvidence({ answerId: "a4", sourceText: "Source", jev: new MockJevAdapter({ ...validJev, sufficient: false }), llm: new MockLlmAdapter({ summary: "bad", evidence: [{ answerId: "a4", evidenceId: "e4", quote: "Source", summary: "bad" }], citedEvidenceIds: ["e4"] }), store });
  if (!insufficient.ok || !insufficient.insufficient || insufficient.llm) throw new Error("insufficient evidence assertion failed");
  if (!followUpAllowed(0, false) || followUpAllowed(1, false) || followUpAllowed(0, true)) throw new Error("follow-up limit assertion failed");
}
main();

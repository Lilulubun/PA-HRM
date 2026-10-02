import neo4j from "neo4j-driver";
import type { Driver } from "neo4j-driver";
import { exactQuote, type EvidenceClassification } from "./ai-evidence";
const uri = process.env.NEO4J_URI ?? "bolt://127.0.0.1:7687";
const user = process.env.NEO4J_USER ?? "neo4j";
const password = process.env.NEO4J_PASSWORD ?? "neo4j";

export type EvidenceRow = { id: string; classification: string; answerId: string; sourceText: string };

function unavailable(error: unknown): Error {
  return new Error(`Neo4j unavailable at ${uri}. ${(error as Error).message}`);
}
function driver(): Driver { return neo4j.driver(uri, neo4j.auth.basic(user, password)); }

export async function answerSourceText(answerId: string): Promise<string> {
  const session = driver().session();
  try {
    const result = await session.run("MATCH (a:Answer {id:$id}) RETURN a.text AS text", { id: answerId });
    return result.records[0]?.get("text") ?? "";
  } catch (error) { throw unavailable(error); } finally { await session.close(); }
}

export async function saveJev(input: { answerId: string; result: unknown }): Promise<void> {
  const session = driver().session();
  try {
    await session.run("MATCH (a:Answer {id:$answerId}) MERGE (j:JevResult {id:'jev:'+a.id}) ON CREATE SET j.createdAt=datetime() SET j += $props MERGE (j)-[:ASSESSED]->(a)", { answerId: input.answerId, props: JSON.parse(JSON.stringify(input.result)) });
  } catch (error) { throw unavailable(error); } finally { await session.close(); }
}

export async function saveEvidence(input: { evidenceId: string; answerId: string; quote: string; classification: EvidenceClassification; sourceText: string }): Promise<void> {
  if (!exactQuote(input.sourceText, input.quote)) return;
  const session = driver().session();
  const rel = input.classification === "support" ? "SUPPORTED_BY" : "CONTRADICTS";
  try {
    await session.run(`MATCH (a:Answer {id:$answerId}) MERGE (e:Evidence {id:$evidenceId}) ON CREATE SET e.quote=$quote, e.classification=$classification, e.current=false, e.createdAt=datetime(), e.answer_version=coalesce(a.currentVersion,1) MERGE (e)-[:${rel}]->(a)`, { evidenceId: input.evidenceId, answerId: input.answerId, quote: input.quote, classification: input.classification });
  } catch (error) { throw unavailable(error); } finally { await session.close(); }
}

export async function startEvidenceVersion(answerId: string): Promise<number> {
  const session = driver().session();
  try {
    const result = await session.run("MATCH (:Evidence {current:true})-[:SOURCE_FOR|SUPPORTED_BY|CONTRADICTS]->(a:Answer {id:$id}) RETURN count(*) AS n", { id: answerId });
    return Number(result.records[0]?.get("n") ?? 0);
  } catch (error) { throw unavailable(error); } finally { await session.close(); }
}

export async function retireCurrentEvidence(answerId: string): Promise<void> {
  const session = driver().session();
  try {
    await session.run("MATCH (e:Evidence {current:true})-[:SUPPORTED_BY|CONTRADICTS]->(a:Answer {id:$id}) SET e.current=false, e.supersededAt=datetime()", { id: answerId });
  } catch (error) { throw unavailable(error); } finally { await session.close(); }
}

export async function markEvidenceCurrent(answerId: string, evidenceIds: string[]): Promise<void> {
  const session = driver().session();
  try {
    await session.run(`UNWIND $ids AS id MATCH (e:Evidence {id:id})-[:SUPPORTED_BY|CONTRADICTS]->(:Answer {id:$answerId}) SET e.current=true`, { ids: evidenceIds, answerId });
  } catch (error) { throw unavailable(error); } finally { await session.close(); }
}

export async function saveSummary(input: { answerId: string; summary: string; citedEvidenceIds: string[] }): Promise<void> {
  const session = driver().session();
  try {
    await session.run("MATCH (a:Answer {id:$answerId}) MERGE (s:Summary {id:'summary:'+a.id}) SET s.text=$summary, s.citedEvidenceIds=$cited, s.createdAt=datetime()", { answerId: input.answerId, summary: input.summary, cited: input.citedEvidenceIds });
  } catch (error) { throw unavailable(error); } finally { await session.close(); }
}

export async function saveFailure(input: { answerId: string; stage: string; error: string }): Promise<void> {
  const session = driver().session();
  try {
    await session.run("MATCH (a:Answer {id:$answerId}) MERGE (f:ModelFailure {id:'failure:'+a.id+':'+$stage}) SET f.stage=$stage, f.error=$error, f.createdAt=datetime() MERGE (f)-[:FAILED_FOR]->(a)", { answerId: input.answerId, stage: input.stage, error: input.error });
  } catch (error) { throw unavailable(error); } finally { await session.close(); }
}

export async function listEvidence(): Promise<EvidenceRow[]> {
  const session = driver().session();
  try {
    const result = await session.run("MATCH (e:Evidence)-[r:SUPPORTED_BY|CONTRADICTS]->(a:Answer) RETURN e.id AS id, e.classification AS classification, a.id AS answerId, a.text AS sourceText ORDER BY e.id");
    return result.records.map((r) => ({ id: r.get("id"), classification: r.get("classification"), answerId: r.get("answerId"), sourceText: r.get("sourceText") }));
  } catch (error) { throw unavailable(error); } finally { await session.close(); }
}

export async function appraisalAnswers(appraisalId: string): Promise<{ id: string; text: string }[]> {
  const session = driver().session();
  try {
    const result = await session.run("MATCH (:Appraisal {id:$id})<-[:ABOUT]-(:Feedback)-[:HAS_ANSWER]->(a:Answer) WHERE trim(a.text)<>'' RETURN a.id AS id, a.text AS text UNION MATCH (a:Answer) WHERE a.id STARTS WITH 'self-review:' AND trim(a.text)<>'' RETURN a.id AS id, a.text AS text", { id: appraisalId });
    return result.records.map((r) => ({ id: r.get("id"), text: r.get("text") }));
  } catch (error) { throw unavailable(error); } finally { await session.close(); }
}

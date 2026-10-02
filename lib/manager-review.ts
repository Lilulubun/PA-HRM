import neo4j from "neo4j-driver";

const uri = process.env.NEO4J_URI ?? "bolt://127.0.0.1:7687";
const user = process.env.NEO4J_USER ?? "neo4j";
const password = process.env.NEO4J_PASSWORD ?? "neo4j";

export type EvidenceTrace = { id: string; classification: string; answerId: string; sourceText: string };
export type ManagerReview = { appraisalId: string; employeeId: string; managerId: string; status: "draft" | "final"; rating: number | null; rationale: string; rubricAnchor: string; supportingEvidenceIds: string[]; counterEvidenceIds: string[]; evidence: EvidenceTrace[]; finalizedAt: string | null };
export type ReviewInput = { rating: number; rationale: string; rubricAnchor: string; supportingEvidenceIds: string[]; counterEvidenceIds: string[] };

function unavailable(error: unknown): Error { return new Error(`Neo4j unavailable at ${uri}. Start local Neo4j and set NEO4J_PASSWORD. ${(error as Error).message}`); }
function driver() { return neo4j.driver(uri, neo4j.auth.basic(user, password)); }
function validate(input: ReviewInput) {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) throw new Error("Rating must be an integer from 1 to 5");
  if (typeof input.rationale !== "string" || input.rationale.trim().length === 0 || input.rationale.length > 10000) throw new Error("Invalid rationale");
  if (typeof input.rubricAnchor !== "string" || !/^anchor-[a-z0-9-]+-[1-5]$/.test(input.rubricAnchor)) throw new Error("Invalid rubric anchor");
  if (![...input.supportingEvidenceIds, ...input.counterEvidenceIds].every((id) => typeof id === "string" && id.length <= 200)) throw new Error("Invalid evidence ID");
}

export async function getManagerReview(appraisalId: string, managerId: string): Promise<ManagerReview> {
  const d = driver(); const s = d.session();
  try {
    const result = await s.run(`
      MATCH (ap:Appraisal {id:$appraisalId, managerId:$managerId})
      OPTIONAL MATCH (ap)-[:HAS_DECISION]->(dec:ManagerDecision)
      WITH ap, dec ORDER BY dec.createdAt DESC
      WITH ap, head(collect(dec)) AS decision
      OPTIONAL MATCH (decision)-[:REVISES|FINALIZES]->(r:Rating)-[:RATED_AGAINST]->(anchor:RubricAnchor)
      OPTIONAL MATCH (r)-[:SUPPORTED_BY]->(se:Evidence)
      OPTIONAL MATCH (r)-[:COUNTERED_BY]->(ce:Evidence)
      WITH ap, decision, r, anchor, collect(DISTINCT se.id) AS supporting, collect(DISTINCT ce.id) AS counter
      CALL {
        WITH ap
        OPTIONAL MATCH (f2:Feedback)-[:ABOUT]->(ap)
        OPTIONAL MATCH (f2)-[:HAS_ANSWER]->(fa:Answer)
        WITH ap, collect(DISTINCT fa) AS faList
        OPTIONAL MATCH (ap)-[:HAS_ANSWER]->(sa:Answer)
        WITH faList, collect(DISTINCT sa) AS saList
        RETURN faList + saList AS combinedAnswers
      }
      UNWIND combinedAnswers AS a
      OPTIONAL MATCH (a)-[:SOURCE_FOR]->(e:Evidence {current:true})
      WITH ap, decision, r, anchor, supporting, counter, collect(DISTINCT {id:e.id, classification:coalesce(e.classification, "SOURCE_FOR"), answerId:a.id, sourceText:a.text}) AS evRows
      RETURN ap.id AS appraisalId, ap.employeeId AS employeeId, ap.managerId AS managerId,
        coalesce(decision.status, 'draft') AS status, r.level AS rating, coalesce(decision.rationale, '') AS rationale,
        anchor.id AS rubricAnchor,
        [x IN supporting | toString(x)] AS supporting,
        [x IN counter | toString(x)] AS counter,
        decision.finalizedAt AS finalizedAt,
        ap.id AS apId, evRows`, { appraisalId, managerId });
    const r = result.records[0]; if (!r) throw new Error("Forbidden");
    const idToEvidence: Record<string, string> = {};
    for (const row of r.get("evRows") as EvidenceTrace[]) if (row.id) idToEvidence[row.id] = row.id;
    return { appraisalId:r.get("appraisalId"), employeeId:r.get("employeeId"), managerId:r.get("managerId"), status:r.get("status"), rating:r.get("rating") === null ? null : Number(r.get("rating")), rationale:r.get("rationale"), rubricAnchor:r.get("rubricAnchor"), supportingEvidenceIds:r.get("supporting").filter((x: string) => idToEvidence[x]), counterEvidenceIds:r.get("counter").filter((x: string) => idToEvidence[x]), finalizedAt:r.get("finalizedAt")?.toString?.() ?? null, evidence:(r.get("evRows") as EvidenceTrace[]).filter((e: EvidenceTrace) => e.id) };
  } catch (error) { if ((error as Error).message === "Forbidden") throw error; throw unavailable(error); } finally { await s.close(); await d.close(); }
}

export async function saveManagerDraft(appraisalId: string, managerId: string, input: ReviewInput): Promise<void> {
  validate(input); const d=driver(); const s=d.session();
  try {
    const result = await s.run(`MATCH (ap:Appraisal {id:$appraisalId, managerId:$managerId}) WHERE NOT (ap)-[:HAS_DECISION]->(:ManagerDecision {status:'final'})
      MATCH (anchor:RubricAnchor {id:$rubricAnchor})
      CREATE (r:Rating {id:'rating-draft:'+ $appraisalId + ':' + randomUUID(), status:'draft', level:$rating, rubricVersion:'v1', createdAt:datetime()})
      CREATE (ap)-[:HAS_RATING]->(r)
      CREATE (r)-[:RATED_AGAINST]->(anchor)
      WITH r, ap OPTIONAL MATCH (e:Evidence {current:true}) WHERE e.id IN $supporting WITH r, ap, collect(e) AS ses OPTIONAL MATCH (e2:Evidence {current:true}) WHERE e2.id IN $counter WITH r, ap, ses, collect(e2) AS ces CALL { WITH r, ses UNWIND ses AS se MERGE (r)-[:SUPPORTED_BY]->(se) } CALL { WITH r, ces UNWIND ces AS ce MERGE (r)-[:COUNTERED_BY]->(ce) }
      WITH ap, r CREATE (dec:ManagerDecision {id:'decision-draft:'+ $appraisalId + ':' + randomUUID(), status:'draft', action:'draft_save', rationale:$rationale, managerId:$managerId, createdAt:datetime()})
      CREATE (ap)-[:HAS_DECISION]->(dec)
      CREATE (dec)-[:REVISES]->(r)
      WITH ap, r, dec MATCH (m:Manager {id:$managerId}) CREATE (m)-[:MADE_DECISION]->(dec)
      RETURN dec.id AS id`, { appraisalId, managerId, rating:input.rating, rationale:input.rationale, rubricAnchor:input.rubricAnchor, supporting:input.supportingEvidenceIds, counter:input.counterEvidenceIds });
    if (!result.records[0]) throw new Error("FORBIDDEN");
  } catch (error) { if ((error as Error).message === "FORBIDDEN") throw error; throw unavailable(error); } finally { await s.close(); await d.close(); }
}

export async function finalizeManagerReview(appraisalId: string, managerId: string, input: ReviewInput): Promise<void> {
  validate(input); const d=driver(); const s=d.session();
  try {
    const result = await s.run(`MATCH (ap:Appraisal {id:$appraisalId, managerId:$managerId}) WHERE NOT (ap)-[:HAS_DECISION]->(:ManagerDecision {status:'final'})
      MATCH (anchor:RubricAnchor {id:$rubricAnchor})
      CREATE (r:Rating {id:'rating-final:'+ $appraisalId + ':' + randomUUID(), status:'final', level:$rating, rubricVersion:'v1', createdAt:datetime()})
      CREATE (ap)-[:HAS_RATING]->(r)
      CREATE (r)-[:RATED_AGAINST]->(anchor)
      WITH r, ap OPTIONAL MATCH (e:Evidence {current:true}) WHERE e.id IN $supporting WITH r, ap, collect(e) AS ses OPTIONAL MATCH (e2:Evidence {current:true}) WHERE e2.id IN $counter WITH r, ap, ses, collect(e2) AS ces CALL { WITH r, ses UNWIND ses AS se MERGE (r)-[:SUPPORTED_BY]->(se) } CALL { WITH r, ces UNWIND ces AS ce MERGE (r)-[:COUNTERED_BY]->(ce) }
      WITH ap, r CREATE (dec:ManagerDecision {id:'decision-final:'+ $appraisalId + ':' + randomUUID(), status:'final', action:'finalize', rationale:$rationale, managerId:$managerId, createdAt:datetime(), finalizedAt:datetime()})
      CREATE (ap)-[:HAS_DECISION]->(dec)
      CREATE (dec)-[:FINALIZES]->(r)
      WITH ap, r, dec MATCH (m:Manager {id:$managerId}) CREATE (m)-[:MADE_DECISION]->(dec)
      RETURN dec.id AS id`, { appraisalId, managerId, rating:input.rating, rationale:input.rationale, rubricAnchor:input.rubricAnchor, supporting:input.supportingEvidenceIds, counter:input.counterEvidenceIds });
    if (!result.records[0]) throw new Error("Appraisal already finalized or forbidden");
  } catch (error) { if ((error as Error).message === "Appraisal already finalized or forbidden") throw error; throw unavailable(error); } finally { await s.close(); await d.close(); }
}

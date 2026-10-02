import neo4j from "neo4j-driver";

const uri = process.env.NEO4J_URI ?? "bolt://127.0.0.1:7687";
const user = process.env.NEO4J_USER ?? "neo4j";
const password = process.env.NEO4J_PASSWORD ?? "neo4j";

export async function resetDemo(): Promise<Record<string, number>> {
  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  const session = driver.session();
  const cleared: Record<string, number> = {};
  try {
    const wiped = await session.run(`
      MATCH (n) WHERE n:ModelFailure OR n:Summary OR n:JevResult OR n:Evidence OR n:ManagerDecision
      DETACH DELETE n RETURN count(n) AS c`);
    cleared["ai-and-decision-nodes"] = Number(wiped.records[0]?.get("c") ?? 0);
    const live = await session.run(`
      MATCH (n) WHERE n.id STARTS WITH 'fb-live:' OR n.id STARTS WITH 'answer-live:'
      DETACH DELETE n RETURN count(n) AS c`);
    cleared["live-peer-nodes"] = Number(live.records[0]?.get("c") ?? 0);
    const draft = await session.run(`
      MATCH (ap:Appraisal) SET ap.draftRating=null, ap.draftRationale=null, ap.draftRubricAnchor=null, ap.draftSupportingEvidenceIds=null, ap.draftCounterEvidenceIds=null RETURN count(ap) AS c`);
    cleared["appraisals-draft-cleared"] = Number(draft.records[0]?.get("c") ?? 0);
    const seeded = await session.run("MATCH (n) RETURN count(n) AS c");
    cleared["remaining-nodes"] = Number(seeded.records[0]?.get("c") ?? 0);
    return cleared;
  } catch (error) {
    throw new Error(`Neo4j unavailable at ${uri}. ${(error as Error).message}`);
  } finally { await session.close(); await driver.close(); }
}

if (require.main === module) {
  resetDemo()
    .then((r) => { console.log("Demo state reset (synthetic only):", JSON.stringify(r, null, 1)); })
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}

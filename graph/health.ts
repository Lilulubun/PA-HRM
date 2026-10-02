import { readFileSync } from "node:fs";
import neo4j from "neo4j-driver";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)]; }));
const driver = neo4j.driver(env.NEO4J_URI ?? "bolt://127.0.0.1:7687", neo4j.auth.basic(env.NEO4J_USER ?? "neo4j", env.NEO4J_PASSWORD ?? ""));
const session = driver.session();

const checks: { name: string; cypher: string }[] = [
  { name: "Feedback without Appraisal link", cypher: "MATCH (f:Feedback) WHERE NOT EXISTS { MATCH (:Appraisal)-[:HAS_FEEDBACK]->(f) } RETURN count(f) AS bad" },
  { name: "Feedback without REGARDS to employee", cypher: "MATCH (f:Feedback) WHERE NOT EXISTS { MATCH (f)-[:REGARDS]->(:Employee) } AND NOT EXISTS { MATCH (f)-[:ABOUT]->(:Employee) } RETURN count(f) AS bad" },
  { name: "Evidence without exactly one SOURCE_FOR", cypher: "MATCH (e:Evidence) WITH e, count { MATCH (e)<-[:SOURCE_FOR]-() } AS c WHERE c <> 1 RETURN count(e) AS bad" },
  { name: "Answer without currentVersion", cypher: "MATCH (a:Answer) WHERE a.currentVersion IS NULL RETURN count(a) AS bad" },
  { name: "Rating without RATED_AGAINST anchor", cypher: "MATCH (r:Rating) WHERE NOT EXISTS { MATCH (r)-[:RATED_AGAINST]->(:RubricAnchor) } RETURN count(r) AS bad" },
  { name: "Peer feedback still using legacy SUBMITTED edge", cypher: "MATCH (:Reviewer)-[s:SUBMITTED]->(:Feedback) RETURN count(s) AS bad" },
];
async function main(): Promise<void> {
  let failed = 0;
  for (const check of checks) {
    try {
      const result = await session.run(check.cypher);
      const bad = result.records[0]?.get("bad")?.toNumber?.() ?? 0;
      console.log(`${bad === 0 ? "OK  " : "FAIL"} ${check.name}: ${bad}`);
      if (bad !== 0) failed++;
    } catch (error) {
      console.log(`ERR  ${check.name}: ${(error as Error).message.split("\n")[0]}`);
      failed++;
    }
  }
  process.exitCode = failed === 0 ? 0 : 1;
}

main().finally(async () => { await session.close(); await driver.close(); });

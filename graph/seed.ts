import neo4j from 'neo4j-driver';
import { fixtureManifest } from '../data/fixtures';

const uri = process.env.NEO4J_URI ?? 'bolt://127.0.0.1:7687';
const user = process.env.NEO4J_USER ?? 'neo4j';
const password = process.env.NEO4J_PASSWORD ?? 'neo4j';

const cypher = `
UNWIND $feedback AS item
MERGE (f:Feedback {id:item.id}) ON CREATE SET f.synthetic=true, f.reviewerId=item.reviewerId, f.origin='seeded'
MERGE (a:Answer {id:item.answerId}) ON CREATE SET a.synthetic=true, a.text=item.text, a.origin='seeded'
MERGE (f)-[:HAS_ANSWER]->(a)
WITH f, item
MATCH (ap:Appraisal {id:$appraisalId})
MERGE (f)-[:ABOUT]->(ap)
WITH f, item, ap
MATCH (r:Reviewer {id:item.reviewerId})
MERGE (r)-[:PROVIDED]->(f)
WITH f, item, ap
MATCH (e:Employee {id:$employeeId})
MERGE (f)-[:REGARDS]->(e)
MERGE (ap)-[:OF_EMPLOYEE]->(e)
`;

export async function seed(): Promise<void> {
  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  const session = driver.session();
  try {
    await session.run('RETURN 1');
    await session.run('CREATE CONSTRAINT employee_id IF NOT EXISTS FOR (n:Employee) REQUIRE n.id IS UNIQUE');
    await session.run('CREATE CONSTRAINT manager_id IF NOT EXISTS FOR (n:Manager) REQUIRE n.id IS UNIQUE');
    await session.run('CREATE CONSTRAINT reviewer_id IF NOT EXISTS FOR (n:Reviewer) REQUIRE n.id IS UNIQUE');
    await session.run('CREATE CONSTRAINT appraisal_id IF NOT EXISTS FOR (n:Appraisal) REQUIRE n.id IS UNIQUE');
    await session.run('CREATE CONSTRAINT feedback_id IF NOT EXISTS FOR (n:Feedback) REQUIRE n.id IS UNIQUE');
    await session.run('CREATE CONSTRAINT answer_id IF NOT EXISTS FOR (n:Answer) REQUIRE n.id IS UNIQUE');
    await session.run('CREATE CONSTRAINT competency_id IF NOT EXISTS FOR (n:Competency) REQUIRE n.id IS UNIQUE');
    await session.run('CREATE CONSTRAINT anchor_id IF NOT EXISTS FOR (n:RubricAnchor) REQUIRE n.id IS UNIQUE');
    await session.run('MERGE (e:Employee {id:$id}) ON CREATE SET e.name=$name, e.synthetic=true', fixtureManifest.employee);
    await session.run('MERGE (m:Manager {id:$id}) ON CREATE SET m.name=$name, m.synthetic=true', fixtureManifest.manager);
    await session.run('MERGE (a:Appraisal {id:$id}) ON CREATE SET a.employeeId=$employeeId, a.managerId=$managerId, a.synthetic=true', fixtureManifest.appraisal);
    for (const reviewer of fixtureManifest.reviewers) await session.run('MERGE (r:Reviewer {id:$id}) ON CREATE SET r.type=$type, r.synthetic=true', reviewer);
    for (const anchor of fixtureManifest.anchors) await session.run('MERGE (r:RubricAnchor {id:$id}) ON CREATE SET r.level=$level, r.text=$text, r.synthetic=true', anchor);
    await session.run(cypher, { appraisalId: fixtureManifest.appraisal.id, employeeId: fixtureManifest.employee.id, feedback: fixtureManifest.feedback });
    // Self-review answer: authored by the employee, entity-centric link.
    await session.run(`MERGE (a:Answer {id:$id}) ON CREATE SET a.text=$text, a.synthetic=true, a.origin='seeded'
      WITH a MATCH (e:Employee {id:$employeeId}), (ap:Appraisal {id:$appraisalId})
      MERGE (e)-[:AUTHORED]->(a) MERGE (ap)-[:HAS_ANSWER]->(a)
      WITH a WHERE a.currentVersion IS NULL
      CREATE (v:AnswerVersion {version:1, text:$text, origin:'seeded', createdAt:datetime()})
      MERGE (a)-[:HAS_VERSION]->(v)
      SET a.currentVersion = 1`, { id: fixtureManifest.selfReview.id, text: fixtureManifest.selfReview.text, employeeId: fixtureManifest.employee.id, appraisalId: fixtureManifest.appraisal.id });
    await session.run(`MATCH (a:Answer {origin:'seeded'}) WHERE a.currentVersion IS NULL
      MATCH (a)-[:HAS_ANSWER|AUTHORED]-()
      WITH a, a.text AS text
      CREATE (v:AnswerVersion {version:1, text:text, origin:'seeded', createdAt:datetime()})
      MERGE (a)-[:HAS_VERSION]->(v)
      SET a.currentVersion = 1`);
    // T3 migration: SUPPORTED_BY/CONTRADICTS -> SOURCE_FOR (idempotent).
    await session.run(`MATCH (a:Answer)-[r:SUPPORTED_BY|CONTRADICTS]-(e:Evidence)
      MERGE (a)-[:SOURCE_FOR]->(e)
      DELETE r`);
    // Entity-centric hub links.
    await session.run(`MATCH (e:Employee {id:$employeeId}), (ap:Appraisal {id:$appraisalId}), (m:Manager {id:$managerId})
      MERGE (ap)-[:OF_EMPLOYEE]->(e)
      MERGE (m)-[:MANAGES]->(e)
      MERGE (m)-[:CONDUCTS]->(ap)`, { employeeId: fixtureManifest.employee.id, appraisalId: fixtureManifest.appraisal.id, managerId: fixtureManifest.manager.id });
    for (const anchor of fixtureManifest.anchors) {
      await session.run(`MATCH (c:Competency {id:$competencyId}), (r:RubricAnchor {id:$anchorId}) MERGE (r)-[:ANCHOR_FOR]->(c)`, { competencyId: fixtureManifest.competency.id, anchorId: anchor.id });
    }
    await session.run(`MERGE (c:Competency {id:$id}) ON CREATE SET c.name=$name, c.synthetic=true`, fixtureManifest.competency);
  } catch (error) {
    throw new Error(`Neo4j unavailable at ${uri}. Start local Neo4j and set NEO4J_PASSWORD. ${(error as Error).message}`);
  } finally { await session.close(); await driver.close(); }
}

if (require.main === module) seed().then(() => console.log('Synthetic graph seed complete (idempotent, entity-centric).')).catch((error) => { console.error(error.message); process.exitCode = 1; });

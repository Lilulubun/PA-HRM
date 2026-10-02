import neo4j from "neo4j-driver";
import type { Driver } from "neo4j-driver";

const uri = process.env.NEO4J_URI ?? "bolt://127.0.0.1:7687";
const user = process.env.NEO4J_USER ?? "neo4j";
const password = process.env.NEO4J_PASSWORD ?? "neo4j";

export type ReviewAnswer = { questionId: string; prompt: string; text: string; updatedAt: string | null };
export const REVIEW_QUESTIONS = [{ id: "problem-solving", prompt: "Describe how you solved a difficult problem and what you learned." }];

function answerId(appraisalId: string, employeeId: string, questionId: string) {
  return `self-review:${appraisalId}:${employeeId}:${questionId}`;
}
function unavailable(error: unknown): Error { return new Error(`Neo4j unavailable at ${uri}. Start local Neo4j and set NEO4J_PASSWORD. ${(error as Error).message}`); }
function driver(): Driver { return neo4j.driver(uri, neo4j.auth.basic(user, password)); }

export async function getSelfReview(appraisalId: string, employeeId: string): Promise<ReviewAnswer[]> {
  const session = driver().session();
  try {
    const result = await session.run(`
      UNWIND $questions AS q
      MERGE (a:Answer {id:q.id})
      ON CREATE SET a.employeeId=$employeeId, a.appraisalId=$appraisalId, a.questionId=q.questionId,
        a.prompt=q.prompt, a.text="", a.createdAt=datetime()
      RETURN a.questionId AS questionId, a.prompt AS prompt, a.text AS text, toString(a.updatedAt) AS updatedAt
      ORDER BY a.questionId`, {
      appraisalId, employeeId,
      questions: REVIEW_QUESTIONS.map((q) => ({ ...q, id: answerId(appraisalId, employeeId, q.id) })),
    });
    return result.records.map((r) => ({ questionId: r.get("questionId"), prompt: r.get("prompt"), text: r.get("text"), updatedAt: r.get("updatedAt") }));
  } catch (error) { throw unavailable(error); } finally { await session.close(); }
}

export async function saveSelfReview(appraisalId: string, employeeId: string, questionId: string, text: string): Promise<ReviewAnswer> {
  const question = REVIEW_QUESTIONS.find((q) => q.id === questionId);
  if (!question || typeof text !== "string" || text.length > 10000) throw new Error("Invalid answer");
  const session = driver().session();
  try {
    const result = await session.run(`
      MATCH (ap:Appraisal {id:$appraisalId})
      MERGE (a:Answer {id:$id})
      ON CREATE SET a.employeeId=$employeeId, a.appraisalId=$appraisalId, a.questionId=$questionId, a.prompt=$prompt, a.text="", a.createdAt=datetime()
      SET a.text=$text, a.updatedAt=datetime()
      MERGE (ap)-[:HAS_ANSWER]->(a)
      RETURN a.questionId AS questionId, a.prompt AS prompt, a.text AS text, toString(a.updatedAt) AS updatedAt`, {
      id: answerId(appraisalId, employeeId, questionId), appraisalId, employeeId, questionId, prompt: question.prompt, text,
    });
    const r = result.records[0]; return { questionId: r.get("questionId"), prompt: r.get("prompt"), text: r.get("text"), updatedAt: r.get("updatedAt") };
  } catch (error) { throw unavailable(error); } finally { await session.close(); }
}

export async function savePeerFeedback(appraisalId: string, employeeId: string, reviewerId: string, text: string): Promise<{ feedbackId: string; answerId: string; text: string }> {
  if (typeof text !== "string" || !text.trim() || text.length > 10000) throw new Error("Invalid feedback text");
  const feedbackId = `fb-live:${appraisalId}:${employeeId}:${reviewerId}`;
  const id = `answer-live:${appraisalId}:${employeeId}:${reviewerId}`;
  const session = driver().session();
  try {
    const result = await session.run(`
      MATCH (ap:Appraisal {id:$appraisalId})
      MERGE (r:Reviewer {id:$reviewerId}) ON CREATE SET r.type='peer', r.synthetic=true
      MERGE (f:Feedback {id:$feedbackId}) ON CREATE SET f.reviewerId=$reviewerId, f.synthetic=true, f.createdAt=datetime()
      SET f.reviewerId=$reviewerId
      MERGE (a:Answer {id:$answerId})
      ON CREATE SET a.employeeId=$employeeId, a.appraisalId=$appraisalId, a.text="", a.createdAt=datetime()
      SET a.text=$text, a.updatedAt=datetime(), a.synthetic=true
      MERGE (f)-[:HAS_ANSWER]->(a)
      MERGE (f)-[:ABOUT]->(ap)
      MERGE (r)-[:PROVIDED]->(f)
      MERGE (e:Employee {id:$employeeId})
      MERGE (f)-[:REGARDS]->(e)
      RETURN f.id AS feedbackId, a.id AS answerId, a.text AS text`, {
      appraisalId, employeeId, reviewerId, feedbackId, answerId: id, text,
    });
    const r = result.records[0];
    if (!r) throw new Error("Appraisal not found");
    return { feedbackId: r.get("feedbackId"), answerId: r.get("answerId"), text: r.get("text") };
  } catch (error) { if ((error as Error).message === "Appraisal not found") throw error; throw unavailable(error); } finally { await session.close(); }
}

export async function listPeerFeedback(appraisalId: string, employeeId: string): Promise<{ reviewerId: string; answerId: string; text: string; updatedAt: string | null }[]> {
  const session = driver().session();
  try {
    const result = await session.run(`
      MATCH (f:Feedback)-[:ABOUT]->(:Appraisal {id:$appraisalId})
      WHERE f.reviewerId IS NOT NULL
      MATCH (f)-[:HAS_ANSWER]->(a:Answer {employeeId:$employeeId})
      RETURN f.reviewerId AS reviewerId, a.id AS answerId, a.text AS text, toString(a.updatedAt) AS updatedAt
      ORDER BY reviewerId`, { appraisalId, employeeId });
    return result.records.map((r) => ({ reviewerId: r.get("reviewerId"), answerId: r.get("answerId"), text: r.get("text"), updatedAt: r.get("updatedAt") }));
  } catch (error) { throw unavailable(error); } finally { await session.close(); }
}

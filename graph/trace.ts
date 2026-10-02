export const traceEvidenceQuery = `
MATCH (e:Evidence {id: $evidenceId})-[:SUPPORTED_BY|CONTRADICTS]->(a:Answer)<-[:HAS_ANSWER]-(f:Feedback)
MATCH (f)-[:ABOUT]->(ap:Appraisal)
RETURN e { .id, .classification }, a { .id, .text, .synthetic }, f { .id, .reviewerId }, ap { .id, .employeeId }
`;

export const appraisalEvidenceQuery = `
MATCH (ap:Appraisal {id: $appraisalId})<-[:ABOUT]-(f:Feedback)-[:HAS_ANSWER]->(a:Answer)
OPTIONAL MATCH (e:Evidence)-[:SUPPORTED_BY|CONTRADICTS]->(a)
RETURN f { .id, .reviewerId }, a { .id, .text, .synthetic }, collect(e { .id, .classification }) AS evidence
ORDER BY f.id
`;

export const sourceTraceQuery = `
MATCH (e:Evidence {id: $evidenceId})-[:SUPPORTED_BY|CONTRADICTS]->(a:Answer)
MATCH (f:Feedback)-[:HAS_ANSWER]->(a), (f)-[:ABOUT]->(ap:Appraisal)
RETURN e.id AS evidenceId, a.id AS answerId, a.text AS sourceText, f.id AS feedbackId, ap.id AS appraisalId
`;

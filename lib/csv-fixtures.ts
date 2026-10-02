export const CSV_HEADERS = ["record_type", "record_id", "employee_id", "appraisal_id", "reviewer_id", "reviewer_type", "feedback_id", "answer_id", "answer_text", "competency_id", "rating_level", "synthetic"] as const;
export type CsvRow = Record<(typeof CSV_HEADERS)[number], string>;
export type CsvResult = { rows: CsvRow[]; errors: string[] };

function parseLine(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let field = ""; let quoted = false;
  for (let i = 0; i < text.length; i++) { const char = text[i];
    if (char === '"') { if (quoted && text[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted; }
    else if (char === "," && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && text[i + 1] === "\n") i++; row.push(field); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  if (quoted) throw new Error("unterminated quoted field");
  if (field || row.length) { row.push(field); rows.push(row); } return rows;
}
export function parseFixtures(text: string): CsvResult {
  const errors: string[] = []; let parsed: string[][];
  try { parsed = parseLine(text.replace(/^\uFEFF/, "")); } catch (error) { return { rows: [], errors: [(error as Error).message] }; }
  const lines = parsed.filter((row) => row.some((value) => value.trim() !== ""));
  if (!lines.length) return { rows: [], errors: ["CSV is empty"] };
  if (lines[0].join(",") !== CSV_HEADERS.join(",")) return { rows: [], errors: ["Invalid CSV headers"] };
  const rows: CsvRow[] = []; const ids = new Set<string>();
  for (let index = 1; index < lines.length; index++) { const values = lines[index]; const line = index + 1;
    if (values.length !== CSV_HEADERS.length) { errors.push(`row ${line}: wrong column count`); continue; }
    const row = Object.fromEntries(CSV_HEADERS.map((header, i) => [header, values[i].trim()])) as CsvRow;
    if (!row.record_type || !["feedback", "answer"].includes(row.record_type)) errors.push(`row ${line}: record_type must be feedback or answer`);
    if (!row.record_id || ids.has(row.record_id)) errors.push(`row ${line}: duplicate or missing record_id`); ids.add(row.record_id);
    if (row.synthetic !== "true") errors.push(`row ${line}: synthetic=true required`);
    if (row.record_type === "feedback") for (const key of ["employee_id", "appraisal_id", "reviewer_id", "reviewer_type", "feedback_id", "answer_id", "answer_text"] as const) if (!row[key]) errors.push(`row ${line}: ${key} required`);
    if (row.record_type === "answer" && !row.answer_id && !row.record_id) errors.push(`row ${line}: answer_id required`);
    rows.push(row);
  }
  return { rows, errors };
}

export async function importFixtures(text: string): Promise<CsvResult> {
  const result = parseFixtures(text); if (result.errors.length) return result;
  const neo4j = (await import("neo4j-driver")).default;
  const driver = neo4j.driver(process.env.NEO4J_URI ?? "bolt://127.0.0.1:7687", neo4j.auth.basic(process.env.NEO4J_USER ?? "neo4j", process.env.NEO4J_PASSWORD ?? "neo4j"));
  const session = driver.session();
  try {
    await session.run("RETURN 1");
    await session.executeWrite(async (tx) => { for (const row of result.rows) {
      if (row.record_type === "feedback") await tx.run("MERGE (f:Feedback {id:$id}) ON CREATE SET f.synthetic=true, f.reviewerId=$reviewerId MERGE (a:Answer {id:$answerId}) ON CREATE SET a.synthetic=true, a.text=$text MERGE (f)-[:HAS_ANSWER]->(a)", { id: row.feedback_id, reviewerId: row.reviewer_id, answerId: row.answer_id, text: row.answer_text });
      else await tx.run("MERGE (a:Answer {id:$id}) ON CREATE SET a.synthetic=true, a.text=$text", { id: row.answer_id || row.record_id, text: row.answer_text });
    } });
    return result;
  } catch { throw new Error("Neo4j unavailable. Start local Neo4j and set NEO4J_PASSWORD."); } finally { await session.close(); await driver.close(); }
}

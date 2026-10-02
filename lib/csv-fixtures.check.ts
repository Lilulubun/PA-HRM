import { parseFixtures } from "./csv-fixtures";
const header = "record_type,record_id,employee_id,appraisal_id,reviewer_id,reviewer_type,feedback_id,answer_id,answer_text,competency_id,rating_level,synthetic\n";
const result = parseFixtures(`${header}feedback,x,e,a,r,peer,x,ans,"quoted, ""text""",c,,true\n\n`);
if (result.errors.length || result.rows[0].answer_text !== 'quoted, "text"') throw new Error("CSV parser assertion failed");

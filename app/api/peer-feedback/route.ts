import { NextResponse } from "next/server";
import { requireRole, getSession } from "../../../lib/auth";
import { savePeerFeedback, listPeerFeedback } from "../../../lib/self-review";
const appraisalId = "appraisal-001";
const employeeId = "employee-001";
export async function GET() { try { requireRole(await getSession(), "manager"); return NextResponse.json({ peer: await listPeerFeedback(appraisalId, employeeId) }); } catch (error) { const message = (error as Error).message; return NextResponse.json({ error: message.includes("Neo4j unavailable") ? message : "Forbidden" }, { status: message.includes("Neo4j unavailable") ? 503 : 403 }); } }
export async function PUT(request: Request) {
  try {
    requireRole(await getSession(), "manager");
    const body = await request.json();
    return NextResponse.json(await savePeerFeedback(appraisalId, employeeId, String(body.reviewerId ?? ""), body.text));
  } catch (error) { const message = (error as Error).message; return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 400 }); }
}

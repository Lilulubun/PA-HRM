import { NextResponse } from "next/server";
import { requireRole, getSession } from "../../../lib/auth";
import { getSelfReview, saveSelfReview, savePeerFeedback, listPeerFeedback } from "../../../lib/self-review";
const appraisalId = "appraisal-001";
export async function GET() { try { const session = requireRole(await getSession(), "employee"); return NextResponse.json({ answers: await getSelfReview(appraisalId, session.userId), peer: await listPeerFeedback(appraisalId, session.userId) }); } catch (error) { const message=(error as Error).message; return NextResponse.json({ error: message.includes("Neo4j unavailable") ? message : "Forbidden" }, { status: message.includes("Neo4j unavailable") ? 503 : 403 }); } }
export async function PUT(request: Request) {
  try {
    const session = requireRole(await getSession(), "employee");
    const body = await request.json();
    if (body.kind === "peer") return NextResponse.json(await savePeerFeedback(appraisalId, session.userId, String(body.reviewerId ?? ""), body.text));
    return NextResponse.json(await saveSelfReview(appraisalId, session.userId, body.questionId, body.text));
  } catch (error) { const message = (error as Error).message; return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 400 }); }
}

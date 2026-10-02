import { NextResponse } from "next/server";
import { getSession, requireManagerForAppraisal } from "../../../lib/auth";
import { finalizeManagerReview, getManagerReview, saveManagerDraft } from "../../../lib/manager-review";

const appraisalId = "appraisal-001";
function status(error: unknown) {
  const message = (error as Error).message;
  return message.includes("Neo4j unavailable") ? 503 : message.includes("Forbidden") ? 403 : message.includes("finalized") ? 409 : 400;
}
export async function GET() {
  try { const manager = requireManagerForAppraisal(await getSession(), appraisalId); return NextResponse.json(await getManagerReview(appraisalId, manager.userId)); }
  catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: status(error) }); }
}
export async function PUT(request: Request) {
  try { const manager = requireManagerForAppraisal(await getSession(), appraisalId); await saveManagerDraft(appraisalId, manager.userId, await request.json()); return NextResponse.json({ saved: true }); }
  catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: status(error) }); }
}
export async function POST(request: Request) {
  try { const manager = requireManagerForAppraisal(await getSession(), appraisalId); await finalizeManagerReview(appraisalId, manager.userId, await request.json()); return NextResponse.json({ finalized: true }); }
  catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: status(error) }); }
}

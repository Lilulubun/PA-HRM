import { NextResponse } from "next/server";
import { getSession, requireRole } from "../../../lib/auth";
import { graphSummary } from "../../../graph/summary";

export async function GET() {
  try { requireRole(await getSession(), "manager"); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  const summary = await graphSummary();
  return NextResponse.json(summary, { status: summary.status === "ok" ? 200 : 503 });
}

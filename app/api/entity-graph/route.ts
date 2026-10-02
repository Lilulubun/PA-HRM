import { NextResponse } from "next/server";
import { requireRole, getSession } from "../../../lib/auth";
import { entityGraph } from "../../../graph/summary";

export async function GET() {
  try { requireRole(await getSession(), "manager"); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  const graph = await entityGraph();
  return NextResponse.json(graph, { status: graph.status === "ok" ? 200 : 503 });
}

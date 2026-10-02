import { NextResponse } from "next/server";
import { getSession, requireRole } from "../../../lib/auth";
import { importFixtures } from "../../../lib/csv-fixtures";

export async function POST(request: Request) {
  try { requireRole(await getSession(), "manager"); const form = await request.formData(); const file = form.get("file"); if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 }); if (file.size > 5_000_000) return NextResponse.json({ error: "file too large" }, { status: 400 }); const result = await importFixtures(await file.text()); if (result.errors.length) return NextResponse.json(result, { status: 422 }); return NextResponse.json({ imported: result.rows.length }); }
  catch (error) { const message = (error as Error).message; return NextResponse.json({ error: message === "FORBIDDEN" ? "Forbidden" : message }, { status: message === "FORBIDDEN" ? 403 : 503 }); }
}

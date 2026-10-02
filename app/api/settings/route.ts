import { NextResponse } from "next/server";
import { getSession, requireRole } from "../../../lib/auth";
import { getSettings, maskSettings, saveSettings } from "../../../lib/settings";

export async function GET() {
  try { requireRole(await getSession(), "manager"); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  const settings = await getSettings();
  return NextResponse.json(settings ? maskSettings(settings) : null);
}

export async function PUT(request: Request) {
  try {
    requireRole(await getSession(), "manager");
    const saved = await saveSettings(await request.json());
    return NextResponse.json(maskSettings(saved));
  } catch (error) {
    const message = (error as Error).message;
    return NextResponse.json({ error: message === "FORBIDDEN" ? "Forbidden" : message }, { status: message === "FORBIDDEN" ? 403 : 400 });
  }
}

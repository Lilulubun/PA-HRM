import { NextResponse } from "next/server";
import { authenticate, encodeSession, SESSION_COOKIE, sessionCookieOptions } from "../../../../lib/auth";

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (!body || typeof body !== "object" || typeof (body as Record<string, unknown>).userId !== "string" || typeof (body as Record<string, unknown>).password !== "string") {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }
  const input = body as { userId: string; password: string };
  const session = await authenticate(input.userId, input.password);
  if (!session) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, encodeSession(session), sessionCookieOptions);
  return response;
}

import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = "pa_hrm_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;
export type Role = "manager" | "employee";
export type Session = { userId: string; role: Role; exp: number };

type Account = { userId: string; role: Role; passwordHash: string };
function accounts(): Account[] {
  return [
    { userId: "manager-001", role: "manager", passwordHash: process.env.DEMO_MANAGER_PASSWORD_HASH ?? "" },
    { userId: "employee-001", role: "employee", passwordHash: process.env.DEMO_EMPLOYEE_PASSWORD_HASH ?? "" },
  ];
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const digest = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${digest.toString("base64url")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  try {
    const [scheme, salt, value] = encoded.split(":");
    if (scheme !== "scrypt" || !salt || !value) return false;
    const expected = Buffer.from(value, "base64url");
    const actual = (await scrypt(password, salt, expected.length)) as Buffer;
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch { return false; }
}

export async function authenticate(userId: string, password: string): Promise<Session | null> {
  const account = accounts().find((item) => item.userId === userId);
  if (!account || !(await verifyPassword(password, account.passwordHash))) return null;
  return { userId: account.userId, role: account.role, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
}

function secret(): string { return process.env.SESSION_SECRET ?? ""; }
function sign(payload: string): string { return createHmac("sha256", secret()).update(payload).digest("base64url"); }
export function encodeSession(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}
export function decodeSession(value: string | undefined): Session | null {
  if (!value || !secret()) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const supplied = Buffer.from(signature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    if ((session.role !== "manager" && session.role !== "employee") || typeof session.userId !== "string" || session.exp <= Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch { return null; }
}

export async function getSession(): Promise<Session | null> { return decodeSession((await cookies()).get(SESSION_COOKIE)?.value); }
export function requireRole(session: Session | null, role: Role): Session {
  if (!session || session.role !== role) throw new Error("FORBIDDEN");
  return session;
}
export function requireManagerForAppraisal(session: Session | null, appraisalId: string, ownerId = "employee-001"): Session {
  const manager = requireRole(session, "manager");
  if (appraisalId !== "appraisal-001" || ownerId !== "employee-001") throw new Error("FORBIDDEN");
  return manager;
}

export const sessionCookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_TTL_SECONDS };

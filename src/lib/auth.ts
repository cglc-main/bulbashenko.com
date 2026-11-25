import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { SignedInUser } from "@/lib/oidc";

// Admin sessions. The cookie is a short-lived signed token that names a Session row; the row is the session, so
// deleting it (sign-out, "end other sessions", a back-channel logout from the SSO) signs that device out at once.
// src/proxy.ts checks the row on every admin request and renews the cookie while the admin is active.

export const COOKIE_NAME = "bul_session";
const JWT_ALG = "HS256";
const SESSION_MAX_AGE = 60 * 60; // seconds of inactivity before the cookie expires

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET env var is not set");
  return new TextEncoder().encode(secret);
}

/** The Session id in a cookie value, if its signature and expiry are valid. Says nothing about the row. */
export async function getSessionId(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: [JWT_ALG] });
    return typeof payload.sid === "string" ? payload.sid : null;
  } catch {
    return null;
  }
}

/** The Session id of a request if the cookie is valid and the session still exists. */
export async function activeSessionId(req: NextRequest): Promise<string | null> {
  const sid = await getSessionId(req.cookies.get(COOKIE_NAME)?.value ?? "");
  if (!sid) return null;
  const session = await prisma.session.findUnique({ where: { id: sid }, select: { id: true } });
  return session ? sid : null;
}

/** For server components: is there a valid, existing session behind this request's cookie? */
export async function getSessionFromRequest(): Promise<boolean> {
  const sid = await getSessionId((await cookies()).get(COOKIE_NAME)?.value ?? "");
  if (!sid) return false;
  return (await prisma.session.count({ where: { id: sid } })) > 0;
}

async function setCookie(res: NextResponse, sid: string): Promise<void> {
  const token = await new SignJWT({ sid })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearCookie(res: NextResponse): void {
  res.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
}

const LAST_SEEN_UPDATE_INTERVAL = 5 * 60 * 1000; // write lastSeen at most every 5 minutes

/** Renews the cookie of an active session and notes the activity. */
export async function renewSession(sid: string, res: NextResponse): Promise<void> {
  await setCookie(res, sid);
  await prisma.session.updateMany({
    where: { id: sid, lastSeen: { lt: new Date(Date.now() - LAST_SEEN_UPDATE_INTERVAL) } },
    data: { lastSeen: new Date() },
  });
}

// Traefik is the only proxy in front of the app and sets X-Real-Ip to the client's address.
function clientInfo(req: NextRequest) {
  return {
    ip: req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown",
    userAgent: req.headers.get("user-agent") ?? "unknown",
  };
}

/** Records a new admin session for this device, tied to the SSO session it came from, and sets its cookie. */
export async function startSession(req: NextRequest, res: NextResponse, user: SignedInUser): Promise<void> {
  const session = await prisma.session.create({
    data: { ...clientInfo(req), subject: user.subject, oidcSid: user.sid, idToken: user.idToken },
  });
  await setCookie(res, session.id);
}

import { NextRequest, NextResponse } from "next/server";
import { activeSessionId, renewSession } from "@/lib/auth";

// Guards the admin panel and the admin API: a valid cookie whose Session row still exists, renewed on activity.

const PUBLIC_API = new Set([
  "/api/auth/oidc/login",
  "/api/auth/oidc/callback",
  // Called by the SSO server, authenticated by the signed logout token it carries.
  "/api/auth/oidc/backchannel-logout",
  // Probes and the smoke test: whether the database answers and which build runs, nothing else.
  "/api/health",
  // The liveness probe: whether the process answers.
  "/api/live",
]);

const PUBLIC_GET_PREFIXES = ["/api/posts", "/api/projects", "/api/profile", "/api/cv"];

function isPublicApi(req: NextRequest, pathname: string): boolean {
  if (PUBLIC_API.has(pathname)) return true;
  if (req.method !== "GET") return false;
  return pathname === "/api/media" || PUBLIC_GET_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin/login")) {
    if (await activeSessionId(req)) return NextResponse.redirect(new URL("/admin", req.url));
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    const sid = await activeSessionId(req);
    if (!sid) return NextResponse.redirect(new URL("/admin/login", req.url));
    const res = NextResponse.next();
    await renewSession(sid, res);
    return res;
  }

  if (pathname.startsWith("/api/") && !isPublicApi(req, pathname)) {
    const sid = await activeSessionId(req);
    if (!sid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const res = NextResponse.next();
    await renewSession(sid, res);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};

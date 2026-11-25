import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { clearCookie, COOKIE_NAME, getSessionId } from "@/lib/auth";
import { endSessionUrl } from "@/lib/oidc";

// Signs this device out, and says where to send the browser so the SSO ends its session too (and with it every
// other app's single sign-on). The admin panel navigates there.
export async function POST(req: NextRequest) {
  const sid = await getSessionId(req.cookies.get(COOKIE_NAME)?.value ?? "");
  const session = sid ? await prisma.session.findUnique({ where: { id: sid } }) : null;
  if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => null);

  let redirect = "/admin/login";
  try {
    redirect = (session && (await endSessionUrl(session.idToken))) || redirect;
  } catch (err) {
    console.error("SSO end-session URL unavailable:", err);
  }

  const res = NextResponse.json({ ok: true, redirect });
  clearCookie(res);
  return res;
}

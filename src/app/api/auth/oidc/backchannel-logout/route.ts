import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyLogoutToken } from "@/lib/oidc";

// OpenID Connect Back-Channel Logout: the SSO POSTs here when someone signs out anywhere, and the admin sessions
// that came from that SSO session (or, without a sid, all of that person's) end at once.
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const token = form?.get("logout_token");
  if (typeof token !== "string") return Response.json({ error: "invalid_request" }, { status: 400 });

  let target;
  try {
    target = await verifyLogoutToken(token);
  } catch (err) {
    console.warn("back-channel logout refused:", err instanceof Error ? err.message : err);
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const { count } = await prisma.session.deleteMany({
    where: target.sid ? { oidcSid: target.sid } : { subject: target.sub! },
  });
  console.log(`back-channel logout: ended ${count} session(s)`);
  return new Response(null, { status: 200, headers: { "Cache-Control": "no-store" } });
}

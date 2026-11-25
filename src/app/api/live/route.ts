// Liveness: the process answers. Deliberately without the database (that is /api/health, for readiness): a
// Postgres restart must take the site out of rotation, not restart it.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true });
}

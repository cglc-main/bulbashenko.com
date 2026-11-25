// Brings the database (DATABASE_URL) to the schema of this build before the app starts: the init container `migrate`
// of the Deployment (deploy/site.yaml), image target `migrate`.
//
// 1. `prisma migrate deploy`: apply what is new, in order. Concurrent runs (two pods starting) wait on Prisma's lock.
// 2. Drift check: the database must now match prisma/schema.prisma exactly. If not (a hand-made change, a migration
//    that does not match the schema), fail and print the difference; the old version keeps serving meanwhile.
import { execFileSync } from "node:child_process";

execFileSync("node_modules/.bin/prisma", ["migrate", "deploy"], { stdio: "inherit" });

try {
  execFileSync(
    "node_modules/.bin/prisma",
    ["migrate", "diff", "--from-config-datasource", "--to-schema", "prisma/schema.prisma", "--exit-code"],
    { stdio: ["ignore", "pipe", "inherit"] },
  );
  console.log("database matches prisma/schema.prisma");
} catch (error) {
  if (error.status === 2) {
    console.error("DRIFT: the database differs from prisma/schema.prisma after migrating:");
    console.error(error.stdout?.toString());
  }
  process.exit(1);
}

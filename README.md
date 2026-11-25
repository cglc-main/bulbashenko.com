# bulbashenko.com

The personal website and blog of Aleksandr Albekov, live at **[bulbashenko.com](https://bulbashenko.com)**.

It is a single page in the style of a retro terminal, with a CRT filter and an animated ASCII skull in the
background, plus a small admin panel for editing everything on it.

## Features

- **Content**, in English, Russian and Slovak:
  - profile;
  - blog posts (Markdown);
  - projects;
  - a gallery of pictures and videos;
  - files for download, of any size;
  - CV.
- **Admin panel** at `/admin`. It edits:
  - content;
  - captions, order and visibility of media;
  - active sessions.

  Sign-in goes through the single sign-on at `auth.bulbashenko.com`
  ([cglc-main/auth](https://github.com/cglc-main/auth)), and only members of `site-admins` get in. Signing out of the
  panel signs out of the SSO as well. Signing out anywhere else ends the panel's session too (back-channel logout).
- **Background:** an ASCII skull drawn live with WebGL2 in the active palette (`src/components/public/background`);
  the skull under the pointer glitches. Browsers without WebGL2, or too slow to keep up, get the plain background.
- **Sharing and search:** a dynamic Open Graph image, sitemap and robots.

## Stack

| Layer | Technology |
| --- | --- |
| App | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Data | PostgreSQL via Prisma 7 |
| Media | Nextcloud: uploaded to the Team folder `Site`, streamed by the app |
| Sign-in | OpenID Connect against Ory Hydra (`auth.bulbashenko.com`) |
| Hosting | k3s on Hetzner Cloud, deployed by Flux from [cglc-main/infra](https://github.com/cglc-main/infra) |
| CI/CD | GitHub Actions → release `vX.Y.Z` → GHCR → Renovate in infra → Flux → smoke test (details below) |

## Local development

Requirements: Node.js 22+ and Docker.

```sh
docker compose up -d postgres            # local Postgres on :5432
cat > .env <<'EOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bulbashenko
JWT_SECRET=dev-secret-change-me
OIDC_ISSUER=https://auth.bulbashenko.com
OIDC_CLIENT_ID=bulbashenko-site
OIDC_CLIENT_SECRET=<the site's client secret>
EOF
npm install
npm run setup                            # apply prisma/migrations and seed default content
npm run dev                              # http://localhost:3000
```

The `bulbashenko-site` client also accepts `http://localhost:3000/api/auth/oidc/callback`, so local sign-in works
against the real provider. To work fully offline, run the auth test stack (`cglc-main/auth`, `e2e/run.sh up`) and
point `OIDC_ISSUER` at it.

The gallery and files come from a Nextcloud. `docker compose up -d` starts one too. Then
`sh scripts/nextcloud-dev-setup.sh --fixtures` prepares it:
- the user `site`;
- the Team folder `Site`;
- sample files.

It prints the `NEXTCLOUD_*` lines for `.env`. Without them the gallery and files are empty.

## From a pull request to production

```
PR (title: feat:/fix:/...) ─► test.yml: check, build, media ─► merge into main
  └► release.yml: release vX.Y.Z, images ghcr.io/cglc-main/bulbashenko.com{,-migrate,-e2e}:X.Y.Z (Trivy-scanned)
       └► Renovate in cglc-main/infra (merges itself) ─► Flux: migrate, roll out ─► smoke Job against bulbashenko.com
            └► fail: the bot reverts the version
```

Merging the pull request is the only manual step. Big changes go as a stack of small PRs (`gh stack`), merged at
once into one release; a hotfix is its own `fix:` PR. How the deploy works and what the cluster provides:
[cglc-main/docs, contracts/site.md](https://github.com/cglc-main/docs/blob/main/contracts/site.md).

## Layout

| Path | What it is |
| --- | --- |
| `src/` | The app: pages (`app/`), components, `lib/` (auth, OIDC, Prisma, Nextcloud, media sync) |
| `prisma/` | Schema, migrations, seed |
| `scripts/` | `migrate.mjs` (the init container), Nextcloud dev setup, media smoke check |
| `deploy/` | Kubernetes base (Deployment, routes, NetworkPolicies) and `smoke/` (the post-deploy Job) |
| `e2e/` | The read-only smoke suite (Playwright), also an image |
| `registry/` | Design tokens and UI pieces as a shadcn-style registry |

## License

[MIT](LICENSE)

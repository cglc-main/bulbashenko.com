// Where the suite runs. Defaults: production, from the smoke Job after a deploy (deploy/smoke), with plain DNS.
// Locally: E2E_SITE=http://localhost:3000 npx playwright test
const env = (name: string, fallback: string) => process.env[name] || fallback

/** The site under test. */
export const SITE = env("E2E_SITE", "https://bulbashenko.com")
/** The commit this suite was built from (image build arg); the site must report the same in /api/health. */
export const REVISION = env("E2E_REVISION", "")

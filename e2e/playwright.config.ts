import { defineConfig, devices } from "@playwright/test"
import { SITE } from "./tests/env"

// Smoke suite of the site, run against production after every deploy (deploy/smoke): the right build serves, pages
// load, languages switch, media is served. Read-only: it signs nobody in and changes nothing.
export default defineConfig({
  testDir: "./tests",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  reporter: "list",
  outputDir: process.env.E2E_OUTPUT_DIR || "test-results",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: SITE,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
})

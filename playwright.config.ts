import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

// Avoid Cursor sandbox browser cache; use a stable user-level path when unset.
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = `${process.env.HOME}/Library/Caches/ms-playwright`;
}

const e2ePort = process.env.PLAYWRIGHT_PORT || "3100";
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${e2ePort}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 90_000,
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `npx next dev -p ${e2ePort}`,
    url: baseURL,
    // Always boot BSN on 3100 — port 3000 may be another local Next app.
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      ...process.env,
      E2E_TEST_ENABLED: "1",
      E2E_TEST_SECRET:
        process.env.E2E_TEST_SECRET || "local-e2e-secret-change-me",
      E2E_TEST_EMAIL_ALLOWLIST:
        process.env.E2E_TEST_EMAIL_ALLOWLIST || "jerry@techluminateacademy.com",
    },
  },
});

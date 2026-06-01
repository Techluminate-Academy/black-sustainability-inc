import fs from "fs";
import path from "path";
import { test, expect } from "@playwright/test";
import { FIXTURE_SLUGS } from "../lib/caseStudyFixtures";
import {
  applyMemberFixture,
  expectOnMapHome,
  loginAs,
  logoutViaApi,
} from "./helpers";

const OUT_DIR = path.join(process.cwd(), "reports", "case-study-screenshots");

const FIXTURE_FILES: Record<string, string> = {
  "airtable-mighty-members": "01-airtable-mighty-members.png",
  "bulk-migration-dry-run": "02-bulk-migration-dry-run.png",
  "jsonl-audit-log": "03-jsonl-audit-log.png",
  "mighty-member-profile": "04-mighty-member-profile.png",
  "subscription-sync-summary": "05-subscription-sync-summary.png",
  "wix-paid-sync-log": "06-wix-paid-sync-log.png",
  "mongo-member-document": "07-mongo-member-document.png",
  "migration-errors-csv": "08-migration-errors-csv.png",
  "secondary-email-report": "09-secondary-email-report.png",
  "migration-outreach-list": "10-migration-outreach-list.png",
  "deactivated-exclusion": "11-deactivated-exclusion.png",
};

test.describe("Case study portfolio screenshots", () => {
  test.beforeAll(() => {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  });

  for (const slug of FIXTURE_SLUGS) {
    test(`fixture: ${slug}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/case-study/${slug}`);
      await expect(page.locator("h1")).toBeVisible();

      const filename = FIXTURE_FILES[slug] ?? `${slug}.png`;
      await page.screenshot({
        path: path.join(OUT_DIR, filename),
        fullPage: true,
      });
    });
  }

  test("live map — member directory view", async ({ page, request }) => {
    test.setTimeout(120_000);

    await logoutViaApi(request);
    await applyMemberFixture(request, "setTestLocation");

    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page);
    await expectOnMapHome(page);
    await expect(page.getByTestId("map-container")).toBeVisible({ timeout: 45_000 });

    // Optional paid-view impersonation when BSN_IMPERSONATE_ALLOWLIST is configured.
    const impersonate = await page.request.post("/api/test/impersonate", {
      data: { mode: "paid" },
    });
    if (impersonate.ok()) {
      await page.goto("/");
      await expectOnMapHome(page);
      await expect(page.getByTestId("map-container")).toBeVisible({ timeout: 45_000 });
    }

    // Allow map tiles/markers to settle before capture.
    await page.waitForTimeout(5000);

    await page.screenshot({
      path: path.join(OUT_DIR, "05b-member-map-directory.png"),
      fullPage: false,
    });

    await page.request.post("/api/test/impersonate", { data: { mode: "clear" } }).catch(() => {});
    await logoutViaApi(request);
  });

  test("hero — operational outcomes dashboard", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/case-study/subscription-sync-summary");
    await expect(page.getByTestId("case-study-sync-summary")).toBeVisible();

    await page.screenshot({
      path: path.join(OUT_DIR, "00-operational-outcomes-hero.png"),
      fullPage: false,
    });
  });
});

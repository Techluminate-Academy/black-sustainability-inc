import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const E2E_EMAIL =
  process.env.E2E_TEST_EMAIL || "jerry@techluminateacademy.com";

export const E2E_SECRET =
  process.env.E2E_TEST_SECRET || "local-e2e-secret-change-me";

export type FixtureAction =
  | "clearLocation"
  | "setTestLocation"
  | "clearOptOut"
  | "setOptOut";

export async function applyMemberFixture(
  request: APIRequestContext,
  action: FixtureAction,
  email = E2E_EMAIL
): Promise<void> {
  const res = await request.post("/api/test/member-location-fixture", {
    data: { secret: E2E_SECRET, email, action },
  });
  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`Fixture ${action} failed (${res.status()}): ${body}`);
  }
}

export async function loginAs(
  page: Page,
  email = E2E_EMAIL
): Promise<void> {
  await page.goto("/signin?next=/");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: /continue to map/i }).click();
  // Wait for post-login navigation (map or forced location).
  await page.waitForURL(/\/(update-location)?/, { timeout: 60_000 });
}

export async function logoutViaApi(request: APIRequestContext): Promise<void> {
  await request.post("/api/auth/logout");
}

/** Assert the member is on the map home page (not sign-in or update-location). */
export async function expectOnMapHome(page: Page, timeout = 20_000): Promise<void> {
  await expect
    .poll(() => {
      try {
        const path = new URL(page.url()).pathname;
        return path === "/" || path === "";
      } catch {
        return false;
      }
    }, { timeout })
    .toBe(true);
}

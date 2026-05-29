import { test, expect, devices } from "@playwright/test";
import {
  E2E_SECRET,
  applyMemberFixture,
  expectOnMapHome,
  loginAs,
  logoutViaApi,
} from "./helpers";

test.describe("Member map profile modal", () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!E2E_SECRET, "E2E_TEST_SECRET is required");
    await logoutViaApi(request);
    await applyMemberFixture(request, "setTestLocation");
  });

  test.afterEach(async ({ request }) => {
    await logoutViaApi(request);
  });

  test("profile photo opens modal with backdrop on desktop", async ({ page }) => {
    await loginAs(page);
    await expectOnMapHome(page);

    await page.getByTestId("nav-profile-photo").click();

    await expect(page.getByTestId("member-map-profile-overlay")).toBeVisible();
    await expect(page.getByTestId("member-map-profile-backdrop")).toBeVisible();
    await expect(page.getByTestId("member-map-profile-modal")).toBeVisible();
    await expect(page.getByText("Your map profile")).toBeVisible();
    await expect(page).toHaveURL(/\//);
    await expect(page).not.toHaveURL(/\/update-location/);

    await expect(page.getByTestId("member-map-profile-loading")).toBeHidden({
      timeout: 15_000,
    });
    await expect(page.getByTestId("member-map-profile-name")).toBeVisible();
    await expect(page.getByTestId("member-level-visibility-hint")).toBeVisible();
    const bsnLink = page.getByTestId("member-map-profile-bsn-link");
    await expect(bsnLink).toBeVisible();
    await expect(bsnLink).toHaveAttribute("href", "https://www.blacksustainability.org/");
    await expect(bsnLink).toHaveText("Visit the Black Sustainability Network");
    await page.getByTestId("member-level-visibility-hint").click();
    await expect(page.getByTestId("member-level-visibility-tooltip")).toBeVisible();
  });

  test("backdrop click closes modal", async ({ page }) => {
    await loginAs(page);
    await expectOnMapHome(page);
    await page.getByTestId("nav-profile-photo").click();
    await expect(page.getByTestId("member-map-profile-modal")).toBeVisible();

    await page.getByTestId("member-map-profile-backdrop").click({ force: true });
    await expect(page.getByTestId("member-map-profile-modal")).toBeHidden();
  });

  test("My location opens update-location modal on map", async ({ page }) => {
    await loginAs(page);
    await expectOnMapHome(page);
    await page.getByTestId("nav-my-location").click();
    await expect(page.getByTestId("update-location-modal")).toBeVisible();
    await expect(page).not.toHaveURL(/\/update-location/);
  });
});

test.describe("Member map profile modal — mobile", () => {
  test.use({ ...devices["iPhone 13"] });

  test.beforeEach(async ({ request }) => {
    test.skip(!E2E_SECRET, "E2E_TEST_SECRET is required");
    await logoutViaApi(request);
    await applyMemberFixture(request, "setTestLocation");
  });

  test.afterEach(async ({ request }) => {
    await logoutViaApi(request);
  });

  test("mobile nav opens profile modal with backdrop", async ({ page }) => {
    await loginAs(page);
    await expectOnMapHome(page);

    await page.getByTestId("nav-mobile-menu-toggle").click();
    await page.getByTestId("nav-profile-photo").click();

    await expect(page.getByTestId("member-map-profile-backdrop")).toBeVisible();
    await expect(page.getByTestId("member-map-profile-modal")).toBeVisible();

    const modalBox = await page.getByTestId("member-map-profile-modal").boundingBox();
    const viewport = page.viewportSize();
    expect(modalBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (modalBox && viewport) {
      expect(modalBox.width).toBeGreaterThan(viewport.width * 0.85);
    }

    await expect(page.getByTestId("member-map-profile-name")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("member-map-profile-bsn-link")).toBeVisible();
  });
});

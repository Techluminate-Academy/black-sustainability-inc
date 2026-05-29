import { test, expect, devices } from "@playwright/test";
import { E2E_SECRET, expectOnMapHome, loginAs, logoutViaApi } from "./helpers";

test.describe("Member update profile modal", () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!E2E_SECRET, "E2E_TEST_SECRET is required");
    await logoutViaApi(request);
  });

  test.afterEach(async ({ request }) => {
    await logoutViaApi(request);
  });

  test("nav My profile opens modal on map without leaving page", async ({ page }) => {
    await loginAs(page);
    await expectOnMapHome(page);

    await page.getByTestId("nav-my-profile").click();

    await expect(page.getByTestId("update-profile-modal")).toBeVisible();
    await expect(page.getByTestId("update-profile-form")).toBeVisible();
    await expect(page).toHaveURL(/\//);
    await expect(page).not.toHaveURL(/\/update-profile/);
  });

  test("profile view modal Edit profile opens update modal", async ({ page }) => {
    await loginAs(page);
    await expectOnMapHome(page);

    await page.getByTestId("nav-profile-photo").click();
    await expect(page.getByTestId("member-map-profile-modal")).toBeVisible();
    await page.getByTestId("member-map-profile-edit-link").click();

    await expect(page.getByTestId("member-map-profile-modal")).toBeHidden();
    await expect(page.getByTestId("update-profile-modal")).toBeVisible();
    await expect(page).toHaveURL(/\//);
  });

  test("backdrop closes update profile modal", async ({ page }) => {
    await loginAs(page);
    await expectOnMapHome(page);
    await page.getByTestId("nav-my-profile").click();
    await expect(page.getByTestId("update-profile-modal")).toBeVisible();

    await page.getByTestId("update-profile-backdrop").click({ force: true });
    await expect(page.getByTestId("update-profile-modal")).toBeHidden();
  });
});

test.describe("Member update profile modal — mobile", () => {
  test.use({ ...devices["iPhone 13"] });

  test.beforeEach(async ({ request }) => {
    test.skip(!E2E_SECRET, "E2E_TEST_SECRET is required");
    await logoutViaApi(request);
  });

  test.afterEach(async ({ request }) => {
    await logoutViaApi(request);
  });

  test("mobile nav opens update profile modal on map", async ({ page }) => {
    await loginAs(page);
    await expectOnMapHome(page);

    await page.getByTestId("nav-mobile-menu-toggle").click();
    await page.getByTestId("nav-my-profile").click();

    await expect(page.getByTestId("update-profile-modal")).toBeVisible();
    await expect(page).toHaveURL(/\//);
  });
});

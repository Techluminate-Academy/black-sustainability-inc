import { test, expect } from "@playwright/test";
import {
  E2E_EMAIL,
  E2E_SECRET,
  applyMemberFixture,
  expectOnMapHome,
  loginAs,
  logoutViaApi,
} from "./helpers";

test.describe("Member location prompt flows", () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!E2E_SECRET, "E2E_TEST_SECRET is required");
    await logoutViaApi(request);
  });

  test.afterEach(async ({ request }) => {
    await applyMemberFixture(request, "setTestLocation").catch(() => {});
    await logoutViaApi(request);
  });

  test("sign-in redirects to update-location when location is missing", async ({
    page,
    request,
  }) => {
    await applyMemberFixture(request, "clearLocation");
    await applyMemberFixture(request, "clearOptOut");

    await loginAs(page);

    await expectOnMapHome(page);
    await expect(page.getByTestId("update-location-modal")).toBeVisible();
    await expect(page.getByTestId("update-location-forced-banner")).toBeVisible();
    await expect(page.getByText(/action needed: add your location/i)).toBeVisible();
  });

  test("authenticated visit to map redirects when location is missing", async ({
    page,
    request,
  }) => {
    await applyMemberFixture(request, "clearLocation");
    await applyMemberFixture(request, "clearOptOut");

    await loginAs(page);
    await expect(page.getByTestId("update-location-modal")).toBeVisible();

    await page.goto("/");
    await expectOnMapHome(page);
    await expect(page.getByTestId("update-location-modal")).toBeVisible();
  });

  test("sign-in goes to map when test location is set", async ({
    page,
    request,
  }) => {
    await applyMemberFixture(request, "setTestLocation");
    await applyMemberFixture(request, "clearOptOut");

    await loginAs(page);

    await expectOnMapHome(page);
    await expect(page.getByTestId("map-container")).toBeVisible({ timeout: 30_000 });
  });

  test("Don't ask again skips forced prompt on next sign-in", async ({
    page,
    request,
  }) => {
    await applyMemberFixture(request, "clearLocation");
    await applyMemberFixture(request, "clearOptOut");

    await loginAs(page);
    await expect(page.getByTestId("update-location-modal")).toBeVisible();

    await page.getByTestId("dont-ask-again-btn").click();
    await expectOnMapHome(page);

    await logoutViaApi(request);
    await loginAs(page);

    await expectOnMapHome(page);
    await expect(page.getByTestId("update-location-forced-banner")).toHaveCount(0);
  });

  test("My location nav link is visible when signed in", async ({
    page,
    request,
  }) => {
    await applyMemberFixture(request, "setTestLocation");

    await loginAs(page);
    await expectOnMapHome(page);

    await expect(page.getByTestId("nav-my-location")).toBeVisible();
    await page.getByTestId("nav-my-location").click();
    await expect(page.getByTestId("update-location-modal")).toBeVisible();
    await expect(page).not.toHaveURL(/\/update-location/);
  });

  test("map focuses self after save via focus query params", async ({
    page,
    request,
  }) => {
    await applyMemberFixture(request, "setTestLocation");

    await loginAs(page);
    await expectOnMapHome(page);

    await page.goto("/?focus=self&lat=40.7128&lng=-74.0060");
    await expectOnMapHome(page);
    await expect(page.getByTestId("map-self-focus-active")).toBeVisible();
  });

  test("profile photo opens read-only map profile popup", async ({ page, request }) => {
    await applyMemberFixture(request, "setTestLocation");

    await loginAs(page);
    await expectOnMapHome(page);
    await page.getByTestId("nav-profile-photo").click();
    await expect(page.getByTestId("member-map-profile-backdrop")).toBeVisible();
    await expect(page.getByTestId("member-map-profile-modal")).toBeVisible();
    await expect(page.getByText("Your map profile")).toBeVisible();
    await expect(page).not.toHaveURL(/\/update-location/);
  });
});

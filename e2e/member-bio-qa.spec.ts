import { test, expect, devices } from "@playwright/test";
import {
  E2E_EMAIL,
  E2E_SECRET,
  applyBioFixture,
  applyMemberFixture,
  expectOnMapHome,
  loginAs,
  logoutViaApi,
} from "./helpers";

const LEGACY_BIO_TEXT = "E2E legacy fields.BIO only — map markers and profile.";
const TOP_LEVEL_BIO_TEXT = "E2E top-level mongo bio for getMarkers QA.";

async function findSelfMarker(
  request: import("@playwright/test").APIRequestContext
): Promise<{ fields?: { BIO?: string; "EMAIL ADDRESS"?: string } } | undefined> {
  const markersRes = await request.get("/api/getMarkers");
  expect(markersRes.ok()).toBeTruthy();
  const markersJson = await markersRes.json();
  return (markersJson.data ?? []).find(
    (row: { fields?: { "EMAIL ADDRESS"?: string } }) =>
      row.fields?.["EMAIL ADDRESS"]?.toLowerCase() === E2E_EMAIL.toLowerCase()
  );
}

test.describe("Member bio display QA", () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!E2E_SECRET, "E2E_TEST_SECRET is required");
    await logoutViaApi(request);
    await applyMemberFixture(request, "setTestLocation");
    await applyBioFixture(request, "clearBio");
  });

  test.afterEach(async ({ request }) => {
    await applyBioFixture(request, "clearBio");
    await logoutViaApi(request);
  });

  test("map profile guidance mentions My profile button", async ({ page }) => {
    await loginAs(page);
    await expectOnMapHome(page);
    await page.getByTestId("nav-profile-photo").first().click();
    await expect(page.getByTestId("member-map-profile-modal")).toBeVisible();

    const guidance = page.getByTestId("member-map-profile-guidance");
    await expect(guidance).toContainText("To update your profile information");
    await expect(guidance).toContainText("My profile");
    await expect(page.getByTestId("nav-my-profile").first()).toHaveText(/My profile/i);
  });

  test("getMarkers returns top-level mongo bio", async ({ page, request }) => {
    await applyBioFixture(request, "setBio", { bio: TOP_LEVEL_BIO_TEXT });
    await loginAs(page);
    await expectOnMapHome(page);

    const self = await findSelfMarker(request);
    expect(self?.fields?.BIO).toBe(TOP_LEVEL_BIO_TEXT);
  });

  test("getMarkers returns bio from legacy fields.BIO only (Alexis-style)", async ({
    page,
    request,
  }) => {
    await applyBioFixture(request, "setLegacyFieldsBio", { bio: LEGACY_BIO_TEXT });
    await loginAs(page);
    await expectOnMapHome(page);

    const self = await findSelfMarker(request);
    expect(self?.fields?.BIO).toBe(LEGACY_BIO_TEXT);

    const profileRes = await page.request.get("/api/member/map-profile");
    const profileJson = await profileRes.json();
    expect(profileJson.ok).toBe(true);
    expect(typeof profileJson.profile?.bio).toBe("string");
    expect(profileJson.profile.bio.length).toBeGreaterThan(0);

    await page.getByTestId("nav-profile-photo").first().click();
    await expect(page.getByTestId("member-map-profile-loading")).toBeHidden({
      timeout: 15_000,
    });
    await expect(page.getByTestId("member-map-profile-bio")).toBeVisible();
    await expect(page.getByTestId("member-map-profile-bio-empty")).toHaveCount(0);
    await expect(page.getByText("bio unavailable")).toHaveCount(0);
  });

  test("clearBio removes bio from getMarkers payload", async ({ page, request }) => {
    await applyBioFixture(request, "setLegacyFieldsBio", { bio: LEGACY_BIO_TEXT });
    let self = await findSelfMarker(request);
    expect(self?.fields?.BIO).toBe(LEGACY_BIO_TEXT);

    await applyBioFixture(request, "clearBio");
    self = await findSelfMarker(request);
    expect(self?.fields?.BIO ?? "").toBe("");

    await loginAs(page);
    await expectOnMapHome(page);
    await page.getByTestId("nav-profile-photo").first().click();
    await expect(page.getByTestId("member-map-profile-loading")).toBeHidden({
      timeout: 15_000,
    });
    const hasBio = (await page.getByTestId("member-map-profile-bio").count()) > 0;
    const hasEmpty = (await page.getByTestId("member-map-profile-bio-empty").count()) > 0;
    expect(hasBio || hasEmpty).toBe(true);
    await expect(page.getByText("bio unavailable")).toHaveCount(0);
  });
});

test.describe("Member bio display QA — mobile", () => {
  test.beforeEach(async ({ request, page }) => {
    test.skip(!E2E_SECRET, "E2E_TEST_SECRET is required");
    await page.setViewportSize(devices["iPhone 13"].viewport);
    await logoutViaApi(request);
    await applyMemberFixture(request, "setTestLocation");
    await applyBioFixture(request, "setLegacyFieldsBio", { bio: LEGACY_BIO_TEXT });
  });

  test.afterEach(async ({ request }) => {
    await applyBioFixture(request, "clearBio");
    await logoutViaApi(request);
  });

  test("mobile profile modal shows bio and guidance", async ({ page, request }) => {
    await loginAs(page);
    await expectOnMapHome(page);

    const self = await findSelfMarker(request);
    expect(self?.fields?.BIO).toBe(LEGACY_BIO_TEXT);

    await page.getByTestId("nav-mobile-menu-toggle").click();
    await page.getByTestId("nav-mobile-menu").getByTestId("nav-profile-photo").click();
    await expect(page.getByTestId("member-map-profile-loading")).toBeHidden({
      timeout: 15_000,
    });
    await expect(page.getByTestId("member-map-profile-bio")).toBeVisible();
    await expect(page.getByTestId("member-map-profile-guidance")).toContainText("My profile");
  });
});

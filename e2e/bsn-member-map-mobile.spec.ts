import { test, expect } from "@playwright/test";
import { logoutViaApi } from "./helpers";
import {
  MOBILE_VIEWPORTS,
  attachConsoleMonitor,
  expectNoHorizontalOverflow,
  panMapSlightly,
  trackGetMarkersRequests,
  waitForMapUiReady,
} from "./mobile-map-helpers";

for (const viewport of MOBILE_VIEWPORTS) {
  test.describe(`BSN Member Map mobile UX — ${viewport.name} (${viewport.width}×${viewport.height})`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: true,
      hasTouch: true,
    });

    test.beforeEach(async ({ request }) => {
      await logoutViaApi(request);
    });

    test("mobile page load — map, sidebar, search, and industry filter are usable", async ({
      page,
    }) => {
      const consoleMonitor = attachConsoleMonitor(page);

      await page.goto("/");
      await waitForMapUiReady(page);

      await expect(page.getByTestId("map-container")).toBeVisible();
      await expect(page.locator(".mapboxgl-canvas").first()).toBeVisible();
      await expect(page.getByTestId("sidebar-container")).toBeVisible();
      await expect(page.getByTestId("map-search-input")).toBeVisible();
      await expect(page.getByTestId("industry-filter")).toBeVisible();

      // Search input accepts focus and typing on mobile.
      await page.getByTestId("map-search-input").tap();
      await expect(page.getByTestId("map-search-input")).toBeFocused();

      // Industry react-select control is reachable (combobox inside wrapper).
      await expect(
        page.getByTestId("industry-filter").getByRole("combobox")
      ).toBeVisible();

      // Loading overlay should not persist after initial load.
      await expect(page.getByText("Looking for other members...")).toBeHidden();
      await expect(page.getByAltText("sidebar loading")).toBeHidden();

      consoleMonitor.assertClean();
    });

    test("no horizontal overflow", async ({ page }) => {
      await page.goto("/");
      await waitForMapUiReady(page);
      await expectNoHorizontalOverflow(page);
    });

    test("logged-out popup is readable, closable, and has correct CTA copy", async ({
      page,
    }) => {
      await page.goto("/");
      await waitForMapUiReady(page);

      // Faster than the 6s auto-popup: open via restricted connect CTA on a card.
      const firstCard = page.getByTestId("member-card").first();
      await expect(firstCard).toBeVisible({ timeout: 15_000 });
      await firstCard.getByRole("button", { name: /connect/i }).tap();

      const modal = page.getByTestId("member-access-modal");
      await expect(modal).toBeVisible();
      await expect(modal.getByText("Member access required")).toBeVisible();
      await expect(modal.getByTestId("member-access-cta")).toContainText(
        "Log in / Become a Member"
      );

      const modalBox = await modal.boundingBox();
      const vp = page.viewportSize();
      expect(modalBox).not.toBeNull();
      expect(vp).not.toBeNull();
      if (modalBox && vp) {
        expect(modalBox.width).toBeLessThanOrEqual(vp.width);
        expect(modalBox.x).toBeGreaterThanOrEqual(0);
        expect(modalBox.x + modalBox.width).toBeLessThanOrEqual(vp.width + 1);
      }

      await expect(page.getByTestId("member-access-close")).toBeVisible();
      await page.getByTestId("member-access-close").tap();
      await expect(modal).toBeHidden();
    });

    test("logged-out restricted preview looks intentional, not broken", async ({
      page,
    }) => {
      await page.goto("/");
      await waitForMapUiReady(page);

      await expect(page.getByText(/issues viewing profile pictures/i)).toHaveCount(
        0
      );

      const firstCard = page.getByTestId("member-card").first();
      await expect(firstCard).toBeVisible({ timeout: 15_000 });

      // Blurred gallery image for logged-out users.
      const cardImage = firstCard.locator("img").first();
      await expect(cardImage).toHaveClass(/blur-md/);

      // No exposed email addresses in card text (BlurText placeholders only).
      const cardText = await firstCard.innerText();
      expect(cardText).not.toMatch(/@[a-z0-9.-]+\.[a-z]{2,}/i);

      // Connect opens member-access flow instead of external Mighty link.
      await firstCard.getByRole("button", { name: /connect/i }).tap();
      await expect(page.getByTestId("member-access-modal")).toBeVisible();
      await page.getByTestId("member-access-close").tap();
    });

    test("mobile search usability", async ({ page }) => {
      await page.goto("/");
      await waitForMapUiReady(page);

      const search = page.getByTestId("map-search-input");
      await search.tap();
      await search.fill("zzzznonexistentmemberquery12345");
      await page.waitForTimeout(700);

      await expect(page.getByTestId("sidebar-search-empty")).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByText("No results found")).toBeVisible();
      await expect(page.getByTestId("map-container")).toBeVisible();
      await expect(page.locator(".mapboxgl-canvas").first()).toBeVisible();

      await search.fill("");
      await page.waitForTimeout(700);
      await expect(page.getByTestId("member-card").first()).toBeVisible({
        timeout: 20_000,
      });
    });

    test("mobile industry filter usability", async ({ page }) => {
      await page.goto("/");
      await waitForMapUiReady(page);

      await page.getByTestId("industry-filter").tap();
      const firstOption = page.getByRole("option").first();
      await expect(firstOption).toBeVisible({ timeout: 10_000 });
      const optionLabel = (await firstOption.textContent())?.trim() ?? "";
      await firstOption.tap();

      await page.waitForTimeout(800);
      await expectNoHorizontalOverflow(page);
      await expect(page.getByTestId("map-container")).toBeVisible();
      await expect(page.getByTestId("sidebar-container")).toBeVisible();

      const sidebarText = await page.getByTestId("sidebar-container").innerText();
      expect(sidebarText.length).toBeGreaterThan(0);
      if (optionLabel) {
        expect(sidebarText.toLowerCase()).toContain("result");
      }
    });

    test("map pan/zoom does not create getMarkers request storm", async ({
      page,
    }) => {
      const markers = trackGetMarkersRequests(page);

      await page.goto("/");
      await waitForMapUiReady(page);
      await panMapSlightly(page);
      await panMapSlightly(page);
      await page.waitForTimeout(2000);

      markers.assertBounded();
      await expect(page.getByTestId("map-container")).toBeVisible();
      await expect(page.locator(".mapboxgl-canvas").first()).toBeVisible();
    });

    test("viewport empty state is readable when bbox returns no members", async ({
      page,
    }) => {
      let bboxIntercepted = false;

      await page.route("**/api/getMarkers?**", async (route) => {
        bboxIntercepted = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: [] }),
        });
      });

      await page.goto("/");
      await waitForMapUiReady(page);
      await panMapSlightly(page);

      await expect
        .poll(() => bboxIntercepted, { timeout: 20_000 })
        .toBe(true);

      await expect(page.getByTestId("sidebar-viewport-empty")).toBeVisible({
        timeout: 20_000,
      });
      await expect(
        page.getByText("No members visible in this area.")
      ).toBeVisible();
      await expect(
        page.getByText(
          /Try zooming out or searching by city, state, country, organization, or industry/i
        )
      ).toBeVisible();
    });
  });
}

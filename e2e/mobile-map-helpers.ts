import { expect, type Page } from "@playwright/test";

/** Mobile widths validated for BSN Member Map UX. */
export const MOBILE_VIEWPORTS = [
  { name: "iPhone SE", width: 375, height: 667 },
  { name: "iPhone 13/14", width: 390, height: 844 },
  { name: "large mobile", width: 430, height: 932 },
] as const;

/** Max /api/getMarkers calls allowed during a simple load + short pan sequence. */
export const GET_MARKERS_REQUEST_STORM_THRESHOLD = 15;

/**
 * Ignore third-party map tile / network noise. Fail on app-level runtime errors.
 * Documented patterns only — do not blanket-ignore all console errors.
 */
export function isIgnorableConsoleError(text: string): boolean {
  const patterns = [
    /mapbox/i,
    /\btile\b/i,
    /Failed to load resource/i,
    /net::ERR_/i,
    /favicon/i,
    /content-security-policy/i,
    /404 \(Not Found\)/i,
    /WebGL/i,
    /ResizeObserver loop/i,
    /^Warning:/,
    /react-hydration-error/i,
    /Invalid DOM property/i,
    /Prop `.+` did not match/i,
  ];
  return patterns.some((p) => p.test(text));
}

export function attachConsoleMonitor(page: Page) {
  const errors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (isIgnorableConsoleError(text)) return;
    errors.push(text);
  });

  page.on("pageerror", (err) => {
    if (!isIgnorableConsoleError(err.message)) {
      errors.push(err.message);
    }
  });

  return {
    getErrors: () => [...errors],
    assertClean: () => expect(errors, "app console errors").toEqual([]),
  };
}

export function trackGetMarkersRequests(page: Page) {
  const urls: string[] = [];

  page.on("request", (req) => {
    if (req.url().includes("/api/getMarkers")) {
      urls.push(req.url());
    }
  });

  return {
    getCount: () => urls.length,
    getUrls: () => [...urls],
    assertBounded: (max = GET_MARKERS_REQUEST_STORM_THRESHOLD) => {
      expect(
        urls.length,
        `getMarkers request storm (${urls.length} > ${max}): ${urls.slice(0, 5).join(", ")}`
      ).toBeLessThanOrEqual(max);
    },
  };
}

export async function waitForMapUiReady(page: Page, timeout = 60_000): Promise<void> {
  await expect(page.getByTestId("map-container")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".mapboxgl-canvas").first()).toBeVisible({ timeout });
  await expect(page.getByAltText("sidebar loading")).toBeHidden({ timeout });
  await expect(page.getByText("Looking for other members...")).toBeHidden({
    timeout,
  });
}

export async function expectNoHorizontalOverflow(
  page: Page,
  tolerance = 2
): Promise<void> {
  const sizes = await page.evaluate(() => ({
    scrollWidth: Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth
    ),
    innerWidth: window.innerWidth,
  }));
  expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.innerWidth + tolerance);
}

/** Drag the Mapbox canvas slightly to trigger moveend / bbox fetch. */
export async function panMapSlightly(page: Page): Promise<void> {
  const canvas = page.locator(".mapboxgl-canvas").first();
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) return;

  const startX = box.x + box.width * 0.5;
  const startY = box.y + box.height * 0.45;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 80, startY - 40, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(1500);
}

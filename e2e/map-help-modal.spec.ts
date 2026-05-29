import { test, expect, devices } from "@playwright/test";
import { expectOnMapHome } from "./helpers";

test.describe("Map help modal", () => {
  test("help icon opens modal with support form link on desktop", async ({ page }) => {
    await page.goto("/");
    await expectOnMapHome(page);

    await page.getByTestId("nav-map-help").click();

    await expect(page.getByTestId("map-help-overlay")).toBeVisible();
    await expect(page.getByTestId("map-help-intro")).toContainText(
      "Running into any issues? Let us know here:"
    );
    await expect(page.getByTestId("map-help-form-link")).toBeVisible();

    await page.getByRole("button", { name: "Close help" }).click();
    await expect(page.getByTestId("map-help-overlay")).toBeHidden();
  });

  test("help is available from mobile nav", async ({ browser }) => {
    const context = await browser.newContext({
      ...devices["iPhone 13"],
    });
    const page = await context.newPage();
    await page.goto("/");
    await expectOnMapHome(page);

    await page.getByTestId("nav-mobile-menu-toggle").click();
    await page.getByTestId("nav-map-help-mobile").click();

    await expect(page.getByTestId("map-help-modal")).toBeVisible();
    await expect(page.getByTestId("map-help-form-link")).toBeVisible();

    await context.close();
  });
});

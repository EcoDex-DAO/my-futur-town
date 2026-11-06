import { test, expect } from "@playwright/test";

test("real Annecy map works without an API, including building selection and mobile layout", async ({
  page,
}) => {
  const errors: string[] = [];
  const requests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() === 200 && /\/planet\/.*\.pbf/.test(response.url())) {
      requests.push(response.url());
    }
  });
  await page.route("**/health", (route) => route.abort());
  await page.goto("/");
  const extrusion = page.getByLabel("Relief des bâtiments · 2.5D");
  await expect(extrusion).toBeEnabled({ timeout: 40_000 });
  await expect
    .poll(() => requests.length, { timeout: 20_000 })
    .toBeGreaterThan(0);
  await expect(page.locator(".notice[role=alert]")).toHaveCount(0);
  await expect(page.locator(".sidebar-footer")).toContainText("API indisponible");

  // Find an actual rendered building; do not inject geographic test features.
  await expect(async () => {
    let found = false;
    for (const [x, y] of [
      [655, 413],
      [740, 410],
      [610, 520],
      [820, 350],
    ]) {
      await page.mouse.click(x, y);
      const properties = page.locator(".info .caption").first();
      if ((await properties.textContent())?.includes("Couche : building")) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  }).toPass({ timeout: 15_000 });
  await expect(
    page.locator(".info dt").filter({ hasText: /^render_height$/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Fermer les informations" }).click();
  await extrusion.uncheck();
  await expect(page.locator(".map-badge")).toContainText("2D");
  await extrusion.check();
  await expect(page.locator(".map-badge")).toContainText("2.5D");
  await page.getByLabel("Réseau viaire").uncheck();
  await page.getByLabel("Réseau viaire").check();
  await page.getByRole("button", { name: "Recentrer sur Annecy" }).click();
  await expect(page.locator(".notice[role=alert]")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Annecy map fits a mobile viewport without an API", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/health", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator(".map canvas")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator(".notice[role=alert]")).toHaveCount(0);
});

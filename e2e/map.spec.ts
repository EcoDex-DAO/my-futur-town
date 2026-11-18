import { test, expect } from "@playwright/test";

test("real Annecy map works without an API, including building selection and mobile layout", async ({
  page,
}) => {
  // Software 3D rendering can make each map layer change slow on CI hosts.
  test.setTimeout(360_000);
  // A regular desktop viewport keeps the real 3D map test representative while
  // avoiding unnecessary software-rendering work on machines without a GPU.
  await page.setViewportSize({ width: 1024, height: 768 });
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
  await expect(extrusion).toBeEnabled({ timeout: 90_000 });
  await expect
    .poll(() => requests.length, { timeout: 45_000 })
    .toBeGreaterThan(0);
  await expect(page.locator(".notice[role=alert]")).toHaveCount(0);
  await expect(page.locator(".sidebar-footer")).toContainText("API indisponible");

  // Keep the real map and geometry, but hide bus markers and routes through
  // their normal controls so that they do not intercept building clicks.
  await page.getByRole("button", { name: "Menu Bus" }).click();
  await page.getByLabel("Arrêts de bus").selectOption("none");
  await page.getByRole("checkbox", { name: /Tout le réseau/ }).uncheck();
  await page.getByRole("button", { name: "Fermer le menu" }).click();

  // Search a viewport grid: exact building pixels vary with tile data and
  // rendering; every click still selects an actual rendered map feature.
  await expect(async () => {
    let found = false;
    const points = [180, 310, 440, 570, 700, 830, 960].flatMap((x) =>
      [180, 280, 380, 480, 580, 680].map((y) => [x, y] as const),
    );
    for (const [x, y] of points) {
      await page.mouse.click(x, y);
      const properties = page.locator(".info .caption");
      if ((await properties.allTextContents()).some((text) => text.includes("Couche : building"))) {
        found = true;
        break;
      }
      const close = page.getByRole("button", { name: "Fermer les informations" });
      if (await close.isVisible()) await close.click();
    }
    expect(found).toBe(true);
  }).toPass({ timeout: 45_000 });
  await expect(
    page.locator(".info dt").filter({ hasText: /^render_height$/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Fermer les informations" }).click();
  await page.getByRole("button", { name: "Menu Couches de référence" }).click();
  await extrusion.uncheck();
  await expect(page.locator(".map-badge")).toContainText("2D");
  await extrusion.check();
  await expect(page.locator(".map-badge")).toContainText("2.5D");
  await page.getByRole("checkbox", { name: /Réseau viaire/ }).uncheck();
  await page.getByRole("checkbox", { name: /Réseau viaire/ }).check();
  await page.getByRole("button", { name: "Fermer le menu" }).click();
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

import { expect, test } from "@playwright/test";

test("explore les lignes et arrêts SIBRA sans API", async ({ page }) => {
  await page.route("**/health", (route) => route.abort());
  await page.goto("/");
  const panel = page.getByRole("region", { name: "Bus SIBRA" });
  await expect(panel).toBeVisible();
  const firstLine = panel.locator(".sibra-line").first();
  await expect(firstLine).toBeVisible();
  await firstLine.click();
  await expect(firstLine).toHaveAttribute("aria-pressed", "true");
  await expect(panel.getByLabel("Direction")).toBeVisible();
  const firstStop = panel.locator(".sibra-stop-list button").first();
  await expect(firstStop).toBeVisible();
  const stopName = (await firstStop.textContent())?.trim();
  expect(stopName).toBeTruthy();
  await firstStop.click();
  await expect(page.locator(".info h2")).toHaveText(stopName!);
  await expect(panel).toContainText("ODbL");
  const visibility = panel.getByRole("checkbox", { name: "Afficher" });
  await visibility.uncheck();
  await expect(page.getByLabel("Légende du réseau SIBRA")).toHaveCount(0);
  await visibility.check();
  await expect(page.getByLabel("Légende du réseau SIBRA")).toBeVisible();
  await expect(page.locator(".sidebar-footer")).toContainText("API indisponible");
});

test("consulte une ligne SIBRA sur mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/health", (route) => route.abort());
  await page.goto("/");
  const panel = page.getByRole("region", { name: "Bus SIBRA" });
  const firstLine = panel.locator(".sibra-line").first();
  await expect(firstLine).toBeVisible();
  await firstLine.click();
  await expect(panel.locator(".sibra-stop-list li").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

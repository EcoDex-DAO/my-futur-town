import { test, expect } from "@playwright/test";

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`simulation réseau sans API ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route("**/health", (route) => route.abort());
    await page.goto("/");
    await page.getByRole("button", { name: "Menu Bus" }).click();
    await page.getByRole("button", { name: "Simuler les lignes cochées", exact: true }).click();
    const panel = page.getByRole("region", { name: "Simulation des lignes cochées" });
    await expect(panel).toContainText("27 lignes SIBRA cochées");
    await expect(panel).toContainText("2026-11-04 au 2026-12-20", { timeout: 60000 });
    await expect(panel).toContainText("sans temps réel");
    await panel.getByLabel("Date").fill("2026-11-13");
    await panel.getByLabel("Heure").fill("08:00:00");
    await panel.getByLabel("Arrêt estimé").selectOption("20");
    await expect(panel).toContainText("Arrêt estimé : 20 secondes");
    await expect(panel.getByRole("button", { name: "Démarrer" })).toBeEnabled({ timeout: 60000 });
    await panel.getByRole("button", { name: "Démarrer" }).click();
    await expect(panel.locator(".bus-simulation-clock")).not.toContainText("0 bus en circulation");
    await panel.getByRole("button", { name: "Pause" }).click();
    const lines = page.locator(".sibra-line-tree");
    await lines.getByLabel(/Tout le réseau/).uncheck();
    await lines.getByLabel(/Ligne 2 -/).check();
    await lines.getByLabel(/Ligne 3 -/).check();
    await expect(panel).toContainText("2 lignes SIBRA cochées");
    await expect(panel.getByLabel("Bus simulés par ligne")).toContainText(/2 : [1-9]/);
    await expect(panel.getByLabel("Bus simulés par ligne")).toContainText(/3 : [1-9]/);
    await expect(page.locator('.bus-traffic-markers [data-line-id="2"]').first()).toBeAttached();
    await expect(page.locator('.bus-traffic-markers [data-line-id="3"]').first()).toBeAttached();
    await lines.getByLabel(/Ligne 2 -/).uncheck();
    await expect(panel.getByLabel("Bus simulés par ligne")).not.toContainText("2 :");
    await expect(page.locator('.bus-traffic-markers [data-line-id="2"]')).toHaveCount(0);
    await lines.getByLabel(/Ligne 3 -/).uncheck();
    await lines.getByLabel("Principales", { exact: true }).check();
    await expect(panel.getByLabel("Bus simulés par ligne")).toContainText(/4 : [1-9]/);
    await expect(panel.getByLabel("Bus simulés par ligne")).toContainText(/5 : [1-9]/);
    if (viewport.width === 1440) {
      await panel.getByRole("button", { name: "Voir un bus de près" }).click();
      await expect(page.locator(".bus-traffic-markers")).toHaveAttribute("data-models", /^[1-9]\d*$/, { timeout: 60000 });
      await expect(page.locator(".bus-traffic-markers")).toHaveAttribute("data-model-parts", /^[1-9]\d*$/);
      await page.waitForTimeout(6000);
      await page.screenshot({ path: "test-results/traffic-bus-3d.png" });
    }
    await panel.getByLabel("Heure").fill("03:00:00");
    await expect(panel).toContainText("Aucun bus des lignes cochées");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/traffic-${viewport.width}.png` });
  });
}

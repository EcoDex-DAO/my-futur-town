import { test, expect } from "@playwright/test";

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`simulation réseau sans API ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route("**/health", (route) => route.abort());
    await page.goto("/");
    await page.getByRole("button", { name: "Menu Bus" }).click();
    await page.getByRole("button", { name: "Simulation du trafic", exact: true }).click();
    const panel = page.getByRole("region", { name: "Simulation du trafic" });
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
    await panel.getByLabel("Heure").fill("03:00:00");
    await expect(panel).toContainText("Aucun bus des lignes cochées");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/traffic-${viewport.width}.png` });
  });
}

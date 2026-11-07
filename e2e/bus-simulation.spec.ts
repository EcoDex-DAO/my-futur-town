import { expect, test } from "@playwright/test";

test("simule la pointe de la ligne 1 et ses commandes sans API", async ({ page }, testInfo) => {
  await page.route("**/health", (route) => route.abort());
  await page.goto("/");
  const panel = page.getByRole("region", { name: "Pointe de la ligne 1" });
  await expect(panel).toContainText("16 bus simultanés", { timeout: 60_000 });
  await expect(panel.getByLabel("Date")).toHaveValue("2026-11-04");
  await expect(panel.getByLabel("Heure")).toHaveValue("07:49:00");
  await panel.getByRole("button", { name: "Démarrer" }).click();
  await expect(panel.locator(".bus-simulation-clock")).toContainText("16 bus en circulation", { timeout: 60_000 });
  await panel.getByRole("button", { name: "Pause", exact: true }).click();
  const pausedTime = await panel.getByLabel("Heure").inputValue();
  await expect(panel.locator(".bus-simulation-clock strong")).toHaveText(pausedTime);
  await panel.getByRole("button", { name: "×60" }).click();
  await expect(panel.getByRole("button", { name: "×60" })).toHaveAttribute("aria-pressed", "true");
  await panel.getByRole("button", { name: "Voir un bus de près" }).click();
  await page.waitForTimeout(2_500);
  await page.screenshot({ path: testInfo.outputPath("bus-simulation.png") });
  await panel.getByRole("button", { name: "Retour au début" }).click();
  await expect(panel.getByLabel("Heure")).toHaveValue("07:19:00");
  await panel.getByRole("button", { name: "Quitter la simulation" }).click();
  await expect(page.locator(".sibra-panel")).toBeVisible();
});

test("change la vitesse sans sauter dans le temps et conserve la pause sur mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/health", (route) => route.abort());
  await page.goto("/");
  const panel = page.getByRole("region", { name: "Pointe de la ligne 1" });
  await expect(panel.getByLabel("Heure")).toHaveValue("07:49:00", { timeout: 60_000 });
  await page.clock.install({ time: new Date("2026-11-04T07:49:00Z") });
  await page.clock.pauseAt(new Date("2026-11-04T07:49:01Z"));
  await panel.getByRole("button", { name: "Démarrer" }).click();
  await page.clock.runFor(2_000);
  await panel.getByRole("button", { name: "×60", exact: true }).click();
  await expect(panel.getByLabel("Heure")).toHaveValue("07:49:02");
  await page.clock.runFor(1_000);
  await panel.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(panel.getByLabel("Heure")).toHaveValue("07:50:02");
  await page.clock.runFor(2_000);
  await expect(panel.getByLabel("Heure")).toHaveValue("07:50:02");
  await panel.getByLabel("Heure").fill("00:00:00");
  await page.clock.runFor(100);
  await expect(panel).toContainText("Aucun service de la ligne 1 à cette heure.");
  await expect(panel.getByRole("button", { name: "Voir un bus de près" })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

import { expect, test } from "@playwright/test";

for (const width of [1440, 390]) test(`provenance de flotte accessible ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await page.route("https://tiles.openfreemap.org/**", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "Menu Bus" }).click();
  await page.getByRole("button", { name: "Ouvrir le parc de bus" }).click();
  const panel = page.getByRole("dialog", { name: "Flotte d’Annecy" });
  const model = panel.locator("details.bus-fleet-model").filter({ hasText: "Bus standard" }).first();
  await model.locator("summary").first().click();
  const summary = model.getByText("Informations sur Effectif déclaré", { exact: true });
  await summary.focus();
  await page.keyboard.press("Enter");
  const info = summary.locator("..");
  await expect(info.getByText(/Source déclarée pour le modèle/)).toBeVisible();
  await expect(info.getByText(/ne prouve pas l’origine de chaque champ/)).toBeVisible();
  await model.getByLabel("Source ou URL").fill("https://example.org/source");
  await expect(info.getByRole("link", { name: "Ouvrir la source déclarée" })).toHaveAttribute("href", "https://example.org/source");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
});

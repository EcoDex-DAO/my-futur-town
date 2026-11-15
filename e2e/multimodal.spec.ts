import { expect, test } from "@playwright/test";

test("les scénarios multimodaux restent utilisables sans API et survivent au rechargement", async ({ page }) => {
  await page.route("**/health", (route) => route.abort());
  await page.route("**/api/**", (route) => route.abort());
  await page.route("https://tiles.openfreemap.org/**", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "Menu Scénarios multimodaux" }).click();
  await page.getByRole("button", { name: "Nouveau scénario" }).click();
  await page.getByLabel("Nom du scénario").fill("Test Trésums");

  const values = [
    ["Places de stationnement", "100"],
    ["Taux d’occupation moyen", "1"],
    ["Rotations par jour", "1"],
    ["Part des arrivées pendant l’heure", "0.5"],
    ["Personnes par voiture", "2"],
    ["Part prenant le bus", "0.5"],
    ["Voyageurs bus de référence par heure", "80"],
    ["Départs existants par heure", "2"],
    ["Capacité utile par bus", "50"],
    ["Durée du cycle bus", "90"],
  ];
  for (const [label, value] of values) {
    await page.getByRole("spinbutton", { name: label }).fill(value);
  }

  await expect(page.getByText("Estimation pour une heure")).toBeVisible();
  const results = page.locator(".multimodal-results");
  await expect(results.locator("div").filter({ hasText: "Arrivées de voitures" }).locator("dd")).toHaveText("50");
  await expect(results.locator("div").filter({ hasText: "Voyageurs du parking prenant le bus" }).locator("dd")).toHaveText("50");
  await expect(results.locator("div").filter({ hasText: "Départs supplémentaires" }).locator("dd")).toHaveText("1");
  await expect(results.locator("div").filter({ hasText: "Véhicules supplémentaires" }).locator("dd")).toHaveText("2");
  await page.getByText("Origine et périmètre", { exact: true }).first().click();
  await page.getByLabel("Nature — Places de stationnement").selectOption("assumed");
  await page.getByLabel("Source — Places de stationnement").fill("Hypothèse de test");
  await page.getByRole("button", { name: "Enregistrer les scénarios" }).click();
  await page.getByRole("button", { name: "Dupliquer" }).click();
  await page.getByLabel("Nom du scénario").fill("Variante Trésums");
  await page.getByRole("spinbutton", { name: "Places de stationnement" }).fill("120");
  await page.getByRole("button", { name: "Enregistrer les scénarios" }).click();
  await expect(page.getByText("Comparer les scénarios")).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Menu Scénarios multimodaux" }).click();
  await expect(page.getByLabel("Scénario actif").locator("option")).toHaveCount(2);
  await expect(page.getByText("Comparer les scénarios")).toBeVisible();
  const comparison = page.getByRole("region", { name: "Comparaison des scénarios" });
  await expect(comparison.getByRole("row", { name: /Test Trésums/ })).toContainText("50");
  await expect(comparison.getByRole("row", { name: /Variante Trésums/ })).toContainText("60");
  await page.getByText("Origine et périmètre", { exact: true }).first().click();
  await expect(page.getByLabel("Nature — Places de stationnement")).toHaveValue("assumed");
  await expect(page.getByLabel("Source — Places de stationnement")).toHaveValue("Hypothèse de test");
});

test("navigation mobile vers les scénarios et le bilan", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => Object.defineProperty(crypto, "randomUUID", { value: undefined }));
  await page.route("**/health", (route) => route.abort());
  await page.route("**/api/**", (route) => route.abort());
  await page.route("https://tiles.openfreemap.org/**", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "Menu Scénarios multimodaux" }).click();
  await expect(page.getByRole("button", { name: "Nouveau scénario" })).toBeVisible();
  await page.getByRole("button", { name: "Nouveau scénario" }).click();
  await expect(page.getByLabel("Nom du scénario")).toBeVisible();
  await page.getByRole("button", { name: "Menu Bilan" }).click();
  await expect(page.getByLabel("Périmètre du bilan")).toBeVisible();
  await page.getByRole("button", { name: "Menu Scénarios multimodaux" }).click();
  await expect(page.getByRole("button", { name: "Nouveau scénario" })).toBeVisible();
});

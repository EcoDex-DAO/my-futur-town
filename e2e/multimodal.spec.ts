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

test("les trois trames préservent le scénario existant et gardent leurs hypothèses inconnues", async ({ page }) => {
  await page.route("**/health", (route) => route.abort());
  await page.route("**/api/**", (route) => route.abort());
  await page.route("https://tiles.openfreemap.org/**", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "Menu Scénarios multimodaux" }).click();
  await page.getByRole("button", { name: "Nouveau scénario" }).click();
  await page.getByLabel("Nom du scénario").fill("Scénario conservé");
  await page.getByRole("spinbutton", { name: "Places de stationnement" }).fill("123");
  await page.getByRole("button", { name: "Enregistrer les scénarios" }).click();

  await page.getByRole("button", { name: "Ajouter les trois trames de référence" }).click();
  const scenarioSelect = page.getByLabel("Scénario actif");
  await expect(scenarioSelect.locator("option")).toHaveCount(4);
  await expect(page.getByLabel("Nom du scénario")).toHaveValue("Situation actuelle — à documenter");
  await expect(page.getByRole("spinbutton", { name: "Places de stationnement" })).toHaveValue("");
  await expect(page.getByText("Renseignez toutes les valeurs pour calculer une estimation.")).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer les scénarios" }).click();

  await page.reload();
  await page.getByRole("button", { name: "Menu Scénarios multimodaux" }).click();
  await expect(scenarioSelect.locator("option")).toHaveCount(4);
  await expect(scenarioSelect.locator("option")).toHaveText([
    "Scénario conservé",
    "Situation actuelle — à documenter",
    "Pôle multimodal sans hausse majeure des places",
    "Parking à étages et pôle multimodal",
  ]);
  await expect(page.getByRole("spinbutton", { name: "Places de stationnement" })).toHaveValue("123");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("yft:multimodal-bus-scenarios:v1") || "null"));
  expect(stored.scenarios).toHaveLength(4);
  for (const scenario of stored.scenarios.slice(1)) {
    expect(Object.values(scenario.assumptions).every((assumption) =>
      (assumption as { value: unknown; nature: string }).value === null &&
      (assumption as { value: unknown; nature: string }).nature === "unknown",
    )).toBe(true);
    expect(Object.values(scenario.parking).every((value) => value === null)).toBe(true);
    expect(Object.values(scenario.solar).every((value) => value === null)).toBe(true);
  }
});

test("une voirie liée indisponible reste associée après rechargement", async ({ page }) => {
  await page.route("**/health", (route) => route.abort());
  await page.route("**/api/**", (route) => route.abort());
  await page.route("https://tiles.openfreemap.org/**", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "Menu Scénarios multimodaux" }).click();
  await page.getByRole("button", { name: "Nouveau scénario" }).click();
  await page.getByLabel("Nom du scénario").fill("Scénario avec voirie");
  await page.getByRole("button", { name: "Enregistrer les scénarios" }).click();
  await expect(page.getByText("Scénarios enregistrés dans ce navigateur.")).toBeVisible();

  const road = { id: "road-test", ownerId: "owner-test", name: "Voirie sauvegardée", referenceLayerId: "layer-test", referenceVersion: "v-test" };
  await page.evaluate((link) => {
    const key = "yft:multimodal-bus-scenarios:v1";
    const stored = JSON.parse(localStorage.getItem(key)!);
    stored.scenarios[0].roadScenario = link;
    localStorage.setItem(key, JSON.stringify(stored));
  }, road);
  await page.reload();
  await page.getByRole("button", { name: "Menu Scénarios multimodaux" }).click();
  await expect(page.getByText("Voirie liée : Voirie sauvegardée · référence v-test")).toBeVisible();
  await page.getByRole("button", { name: "Ouvrir la voirie liée" }).click();
  await expect(page.getByText("Voirie liée indisponible : configurez Supabase.")).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Menu Scénarios multimodaux" }).click();
  await expect(page.getByText("Voirie liée : Voirie sauvegardée · référence v-test")).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("yft:multimodal-bus-scenarios:v1")!));
  expect(stored.version).toBe(4);
  expect(stored.scenarios[0].roadScenario).toEqual(road);
});

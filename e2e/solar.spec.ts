import { expect, test } from "@playwright/test";

test("une estimation solaire PVGIS reste distincte de la consommation et persiste par scénario", async ({ page }, testInfo) => {
  test.setTimeout(360_000);
  await page.setViewportSize({ width: 900, height: 700 });
  await page.route("**/health", (route) => route.abort());
  await page.route("**/api/**", (route) => route.abort());
  await page.route("**/data/sibra.json", (route) => route.abort());
  await page.route("https://tiles.openfreemap.org/styles/liberty", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#e8eee9" } }] }),
  }));
  let releasePvgis!: () => void;
  const pvgisGate = new Promise<void>((resolve) => { releasePvgis = resolve; });
  await page.route("**/api/pvgis?*", async (route) => {
    await pvgisGate;
    await route.fulfill({ json: {
      annualKwhPerKwp: 1300.22,
      assumptions: { modeledTilt: 30, modeledAspect: 0, meteo: { yearMin: 2005, yearMax: 2023, radiationDatabase: "PVGIS-SARAH3" } },
    } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Menu Scénarios multimodaux" }).click();
  await page.getByRole("button", { name: "Nouveau scénario" }).click();
  await page.getByLabel("Nom du scénario").fill("Solaire de test");
  await page.getByRole("spinbutton", { name: /Surface des ombrières/ }).fill("1000");
  await page.getByRole("spinbutton", { name: /Part couverte par les panneaux/ }).fill("0.8");
  await page.getByRole("spinbutton", { name: /Rendement nominal des panneaux/ }).fill("0.2");
  await page.getByRole("spinbutton", { name: /Inclinaison des panneaux/ }).fill("30");
  await page.getByRole("spinbutton", { name: /Orientation PVGIS/ }).fill("0");
  await page.getByRole("spinbutton", { name: /Pertes du système/ }).fill("14");
  await page.getByRole("button", { name: "Obtenir le productible PVGIS" }).click();
  await page.getByRole("spinbutton", { name: /Consommation annuelle sur place/ }).fill("50000");
  releasePvgis();
  await expect(page.getByRole("spinbutton", { name: /Productible annuel/ })).toHaveValue("1300.22");
  await expect(page.getByText(/Puissance estimée/)).toContainText("160 kWc");
  await expect(page.getByText(/Puissance estimée/)).toContainText(/208\s?035,2 kWh\/an/);
  await expect(page.getByRole("spinbutton", { name: /Consommation annuelle sur place/ })).toHaveValue("50000");
  await expect(page.getByText(/ne calcule pas l’autoconsommation/)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("solaire-bureau.png") });
  await page.getByRole("button", { name: "Enregistrer les scénarios" }).click();
  await page.getByRole("button", { name: "Dupliquer" }).click();
  await page.getByRole("spinbutton", { name: /Inclinaison des panneaux/ }).fill("35");
  await expect(page.getByRole("spinbutton", { name: /Productible annuel/ })).toHaveValue("");
  await page.getByRole("spinbutton", { name: /Productible annuel/ }).fill("1200");
  await expect(page.getByText(/Puissance estimée/)).toContainText(/192\s?000 kWh\/an/);
  await page.getByRole("button", { name: "Enregistrer les scénarios" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Menu Scénarios multimodaux" }).click();
  await expect(page.getByLabel("Scénario actif").locator("option")).toHaveCount(2);
  await expect(page.getByRole("spinbutton", { name: /Productible annuel/ })).toHaveValue("1300.22");
  await page.getByText("Source solaire — Productible annuel", { exact: true }).click();
  await expect(page.getByLabel("Source — Productible annuel")).toHaveValue(/PVGIS 5.3/);
  await expect(page.getByRole("region", { name: "Comparaison des scénarios" })).toBeVisible();
});

test("saisie solaire manuelle sur mobile sans API", async ({ page }, testInfo) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/health", (route) => route.abort());
  await page.route("**/api/**", (route) => route.abort());
  await page.route("**/data/sibra.json", (route) => route.abort());
  await page.route("https://tiles.openfreemap.org/styles/liberty", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#e8eee9" } }] }),
  }));
  await page.goto("/");
  await page.getByRole("button", { name: "Menu Scénarios multimodaux" }).click();
  await page.getByRole("button", { name: "Nouveau scénario" }).click();
  await page.getByRole("spinbutton", { name: /Surface des ombrières/ }).fill("100");
  await page.getByRole("spinbutton", { name: /Part couverte par les panneaux/ }).fill("0.5");
  await page.getByRole("spinbutton", { name: /Rendement nominal des panneaux/ }).fill("0.2");
  await page.getByRole("spinbutton", { name: /Inclinaison des panneaux/ }).fill("20");
  await page.getByRole("spinbutton", { name: /Orientation PVGIS/ }).fill("0");
  await page.getByRole("spinbutton", { name: /Pertes du système/ }).fill("14");
  await page.getByRole("button", { name: "Obtenir le productible PVGIS" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "PVGIS est indisponible" })).toBeVisible();
  await page.getByRole("spinbutton", { name: /Productible annuel/ }).fill("1000");
  await expect(page.getByText(/Puissance estimée/)).toContainText("10 kWc");
  await expect(page.getByText(/Puissance estimée/)).toContainText(/10\s?000 kWh\/an/);
  await page.screenshot({ path: testInfo.outputPath("solaire-mobile.png") });
});

import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("https://tiles.openfreemap.org/styles/liberty", (route) => route.fulfill({ json: { version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#e5eee8" } }] } }));
  await page.route("**/data/sibra.json", (route) => route.fulfill({ json: { metadata: { sourceUrl: "fixture", attribution: "fixture", license: "fixture", validFrom: "2026-01-01", validTo: "2026-12-31", generatedAt: "2026-01-01" }, lines: [{ id: "1", shortName: "1", longName: "Ligne témoin", color: "#008844", variants: [{ id: "v1", headsign: "Trésums", coordinates: [[6.129, 45.896], [6.133, 45.898]], stops: [] }] }] } }));
});

for (const width of [1440, 390]) {
  test(`voies et retour aux autres vues à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await expect(page.getByText("Chargement de la carte d’Annecy…")).toBeHidden({ timeout: 90_000 });
    await page.getByRole("button", { name: "Menu Trésums" }).click();
    await page.getByRole("button", { name: "Créer un projet" }).click();
    await page.getByText("Couches de la carte").click();
    await expect(page.getByText("Voies OSM chargées", { exact: false })).toBeVisible();
    await expect(page.getByRole("region", { name: "Définir la zone du projet" }).getByText("Cadastre chargé", { exact: false })).toBeVisible();
    const pedestrian = page.getByRole("checkbox", { name: "Cheminements piétons" });
    await pedestrian.check();
    await page.getByRole("button", { name: "Menu Bus" }).click();
    await expect(page.getByRole("heading", { name: "Lignes créées" })).toBeVisible();
    const network = page.getByRole("checkbox", { name: /Tout le réseau/ });
    await expect(network).toBeChecked({ timeout: 90_000 });
    await network.uncheck();
    await page.getByRole("button", { name: "Menu Trésums" }).click();
    await expect(pedestrian).toBeChecked();
    await page.getByRole("button", { name: "Menu Bus" }).click();
    await expect(network).not.toBeChecked();
  });
}

test("absence des voies ne bloque pas le cadastre", async ({ page }) => {
  await page.route("**/data/tresums/voies.json", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByText("Chargement de la carte d’Annecy…")).toBeHidden({ timeout: 90_000 });
  await page.getByRole("button", { name: "Menu Trésums" }).click();
  await page.getByRole("button", { name: "Créer un projet" }).click();
  await page.getByText("Couches de la carte").click();
  await expect(page.getByText("Voies indisponibles", { exact: false })).toBeVisible();
  await expect(page.getByRole("region", { name: "Définir la zone du projet" }).getByText("Cadastre chargé", { exact: false })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Dessin libre" })).toBeEnabled();
});

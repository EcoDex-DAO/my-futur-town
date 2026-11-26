import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("https://tiles.openfreemap.org/styles/liberty", (route) => route.fulfill({ json: { version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#e5eee8" } }] } }));
  await page.route("**/data/sibra.json", (route) => route.fulfill({ json: { metadata: { sourceUrl: "fixture", attribution: "fixture", license: "fixture", validFrom: "2026-01-01", validTo: "2026-12-31", generatedAt: "2026-01-01" }, lines: [] } }));
});

for (const width of [1440, 390]) {
  test(`créer, retrouver et annuler une modification à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Menu Trésums" }).click();
    await page.getByRole("button", { name: "Créer un projet" }).click();
    const panel = page.getByRole("region", { name: "Définir la zone du projet" });
    await panel.getByLabel("Nom du projet").fill("Site témoin");
    await panel.getByRole("radio", { name: "Dessin libre" }).check();
    await expect(panel.getByText("0 sommet(s)", { exact: false })).toBeVisible();
    await page.waitForTimeout(1000);
    const canvas = page.locator(".map canvas");
    const box = await canvas.boundingBox();
    if (!box) throw Error("Carte absente");
    for (const [x, y] of [[90, 130], [190, 130], [140, 220]]) await canvas.dispatchEvent("click", { clientX: box.x + x, clientY: box.y + y });
    await expect(panel.getByText("3 sommet(s)", { exact: false })).toBeVisible();
    await panel.getByRole("button", { name: "Confirmer la zone" }).click();
    await expect(page.getByText("Zone confirmée · polygone libre")).toBeVisible();
    const saved = await page.evaluate(() => localStorage.getItem("mft-tresums-projects-v1"));
    expect(saved).toContain("Site témoin");
    await page.reload();
    await page.getByRole("button", { name: "Menu Trésums" }).click();
    await expect(page.getByText("Zone confirmée · polygone libre")).toBeVisible();
    await page.getByRole("button", { name: "Modifier la zone" }).click();
    await panel.getByRole("button", { name: "Retirer le dernier sommet" }).click();
    await panel.getByRole("button", { name: "Annuler", exact: true }).click();
    expect(await page.evaluate(() => localStorage.getItem("mft-tresums-projects-v1"))).toBe(saved);
  });
}

test("l'absence du cadastre laisse le dessin libre disponible", async ({ page }) => {
  await page.route("**/data/tresums/parcelles.json", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "Menu Trésums" }).click();
  await page.getByRole("button", { name: "Créer un projet" }).click();
  const panel = page.getByRole("region", { name: "Définir la zone du projet" });
  await expect(panel.getByText("Cadastre indisponible", { exact: false })).toBeVisible();
  await panel.getByRole("radio", { name: "Dessin libre" }).check();
  await expect(panel.getByText("0 sommet(s)", { exact: false })).toBeVisible();
  await panel.getByRole("button", { name: "Annuler", exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem("mft-tresums-projects-v1"))).toBeNull();
});

test("sélectionne une parcelle et conserve sa géométrie", async ({ page }) => {
  const parcel = { type: "Feature", id: "test-parcelle", properties: { id: "test-parcelle" }, geometry: { type: "Polygon", coordinates: [[[6.125, 45.893], [6.136, 45.893], [6.136, 45.901], [6.125, 45.901], [6.125, 45.893]]] } };
  await page.route("**/data/tresums/parcelles.json", (route) => route.fulfill({ json: { type: "FeatureCollection", features: [parcel] } }));
  await page.goto("/");
  await page.getByRole("button", { name: "Menu Trésums" }).click();
  await page.getByRole("button", { name: "Créer un projet" }).click();
  const panel = page.getByRole("region", { name: "Définir la zone du projet" });
  await panel.getByLabel("Nom du projet").fill("Projet parcelle");
  await expect(panel.getByText("Cadastre chargé", { exact: false })).toBeVisible();
  await panel.getByText("Couches de la carte").click();
  const cadastre = panel.getByRole("checkbox", { name: /Cadastre/ });
  await cadastre.uncheck();
  await expect(panel.getByText("Affichez le cadastre", { exact: false })).toBeVisible();
  await cadastre.check();
  await page.waitForTimeout(1200);
  const canvas = page.locator(".map canvas");
  const box = await canvas.boundingBox();
  if (!box) throw Error("Carte absente");
  await canvas.dispatchEvent("click", { clientX: box.x + box.width / 2 - 150, clientY: box.y + box.height / 2 });
  await expect(panel.getByText("1 sélectionnée(s)", { exact: false })).toBeVisible();
  await panel.getByRole("button", { name: "Confirmer la zone" }).click();
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem("mft-tresums-projects-v1")!));
  expect(data.projects[0].zone.parcels[0].geometry).toEqual(parcel.geometry);
  expect(data.projects[0].parking).toBeNull();
  expect(data.projects[0].flows).toEqual([]);
});

test("ne remplace pas un projet modifié dans un autre onglet", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Menu Trésums" }).click();
  await page.getByRole("button", { name: "Créer un projet" }).click();
  const panel = page.getByRole("region", { name: "Définir la zone du projet" });
  await panel.getByLabel("Nom du projet").fill("Projet en cours");
  await panel.getByRole("radio", { name: "Dessin libre" }).check();
  await page.waitForTimeout(1000);
  const canvas = page.locator(".map canvas");
  const box = await canvas.boundingBox();
  if (!box) throw Error("Carte absente");
  for (const [x, y] of [[90, 130], [190, 130], [140, 220]]) await canvas.dispatchEvent("click", { clientX: box.x + x, clientY: box.y + y });
  const other = JSON.stringify({ version: 1, projects: [] });
  await page.evaluate((value) => localStorage.setItem("mft-tresums-projects-v1", value), other);
  await panel.getByRole("button", { name: "Confirmer la zone" }).click();
  await expect(page.getByRole("region", { name: "Projets Trésums" }).getByRole("alert")).toContainText("Enregistrement impossible");
  expect(await page.evaluate(() => localStorage.getItem("mft-tresums-projects-v1"))).toBe(other);
  await expect(panel.getByText("3 sommet(s)", { exact: false })).toBeVisible();
});

import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("https://tiles.openfreemap.org/styles/liberty", (route) => route.fulfill({ json: { version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#e5eee8" } }] } }));
  await page.route("**/data/sibra.json", (route) => route.fulfill({ json: { metadata: { sourceUrl: "fixture", attribution: "fixture", license: "fixture", validFrom: "2026-01-01", validTo: "2026-12-31", generatedAt: "2026-01-01" }, lines: [] } }));
});

for (const width of [1440, 390]) {
  test(`sélection et édition sur écran ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await expect(page.getByText("Chargement de la carte d’Annecy…")).toBeHidden({ timeout: 90_000 });
    await page.getByRole("button", { name: "Menu Trésums" }).click();
    await expect(page.getByText("Cadastre chargé", { exact: false })).toBeVisible({ timeout: 90_000 });
    const canvas = page.locator(".map canvas");
    await page.getByRole("button", { name: "Sélectionner les parcelles" }).click();
    await page.waitForTimeout(1000);
    const box = await canvas.boundingBox();
    if (!box) throw Error("Carte absente");
    const x = width < 760 ? box.x + box.width / 2 : box.x + box.width / 2 - 120;
    const y = box.y + Math.min(box.height / 2, 250);
    await canvas.dispatchEvent("click", { clientX: x, clientY: y });
    await expect(page.getByText(/Parcelles sélectionnées : 74010/)).toBeVisible();
    await page.getByRole("button", { name: "Accès", exact: true }).click();
    await canvas.dispatchEvent("click", { clientX: x, clientY: y });
    await page.getByRole("button", { name: "Enregistrer la forme" }).click();
    await page.getByLabel("Nom", { exact: true }).fill("Accès projet");
    await page.reload();
    await page.getByRole("button", { name: "Menu Trésums" }).click();
    await expect(page.getByText("Accès projet · Accès")).toBeVisible();
    await expect(page.getByText(/Parcelles sélectionnées : 74010/)).toBeVisible();
    await page.getByText("Accès projet · Accès").click();
    await page.getByRole("button", { name: "Supprimer", exact: true }).click();
    await expect(page.getByText("Accès projet · Accès")).toHaveCount(0);
  });
}

test("cadastre indisponible et stockage refusé restent visibles", async ({ page }) => {
  await page.route("**/data/tresums/parcelles.json", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByText("Chargement de la carte d’Annecy…")).toBeHidden({ timeout: 90_000 });
  await page.getByRole("button", { name: "Menu Trésums" }).click();
  await expect(page.getByText("Cadastre indisponible", { exact: false })).toBeVisible({ timeout: 90_000 });
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw Error("quota"); }; });
  await page.getByRole("button", { name: "Accès", exact: true }).click();
  const canvas = page.locator(".map canvas");
  const box = await canvas.boundingBox();
  if (!box) throw Error("Carte absente");
  await canvas.dispatchEvent("click", { clientX: box.x + 300, clientY: box.y + 200 });
  await page.getByRole("button", { name: "Enregistrer la forme" }).click();
  await expect(page.getByRole("region", { name: "Préparation des Trésums" }).getByRole("alert")).toContainText("Enregistrement impossible");
  await expect(page.getByText("Accès : 1 point(s).", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("mft-tresums-v0"))).toBeNull();
});

test("dessine et déplace les sommets des hypothèses", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Chargement de la carte d’Annecy…")).toBeHidden({ timeout: 90_000 });
  await page.getByRole("button", { name: "Menu Trésums" }).click();
  await expect(page.getByText("Cadastre chargé", { exact: false })).toBeVisible({ timeout: 90_000 });
  const canvas = page.locator(".map canvas");
  for (const [label, count] of [["Circulation", 2], ["Sens de circulation", 2], ["Zone de stationnement", 3]] as const) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await page.waitForTimeout(900);
    const box = await canvas.boundingBox();
    if (!box) throw Error("Carte absente");
    for (let i = 0; i < count; i++) await canvas.dispatchEvent("click", { clientX: box.x + 300 + 40 * i, clientY: box.y + 250 + (i === 2 ? 40 : 0) });
    await page.getByRole("button", { name: "Enregistrer la forme" }).click();
  }
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem("mft-tresums-v0")!));
  expect(before.items.map((item: { kind: string }) => item.kind)).toEqual(["circulation", "sens", "parking"]);
  const marker = page.locator(".maplibregl-marker:not(.tresums-arrow)").last();
  const point = await marker.boundingBox();
  if (!point) throw Error("Sommet absent");
  await page.mouse.move(point.x + point.width / 2, point.y + point.height / 2);
  await page.mouse.down();
  await page.mouse.move(point.x + point.width / 2 + 25, point.y + point.height / 2 + 15, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("mft-tresums-v0")!).items[2].points)).not.toEqual(before.items[2].points);
});

test("ne remplace pas un document modifié dans un autre onglet", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Chargement de la carte d’Annecy…")).toBeHidden({ timeout: 90_000 });
  await page.getByRole("button", { name: "Menu Trésums" }).click();
  await expect(page.getByText("Cadastre chargé", { exact: false })).toBeVisible({ timeout: 90_000 });
  const other = JSON.stringify({ version: 1, parcels: ["autre"], items: [] });
  await page.evaluate((raw) => localStorage.setItem("mft-tresums-v0", raw), other);
  await page.getByRole("button", { name: "Accès", exact: true }).click();
  const canvas = page.locator(".map canvas");
  const box = await canvas.boundingBox();
  if (!box) throw Error("Carte absente");
  await canvas.dispatchEvent("click", { clientX: box.x + 300, clientY: box.y + 200 });
  await page.getByRole("button", { name: "Enregistrer la forme" }).click();
  await expect(page.getByRole("region", { name: "Préparation des Trésums" }).getByRole("alert")).toContainText("Enregistrement impossible");
  expect(await page.evaluate(() => localStorage.getItem("mft-tresums-v0"))).toBe(other);
});

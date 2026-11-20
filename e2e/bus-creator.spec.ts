import { test, expect, type Page } from "@playwright/test";

const key = "yft.bus-created-lines.v1";
async function openBus(page: Page) {
  await page.getByRole("button", { name: "Menu Bus" }).click();
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`création et variante locale ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route("**/api/bus-route", async (route) => {
      const points = route.request().postDataJSON().points as [number, number][];
      const routed = points.map((point, index) => [point[0] + (index === 0 ? -0.001 : 0.001), point[1]] as [number, number]);
      const snaps = routed.map((coordinates) => ({ coordinates, distanceM: 0, ambiguous: false }));
      await route.fulfill({ json: { status: "candidate", geometry: routed, snaps, distanceM: 100, warnings: ["Proposition à vérifier"] } });
    });
    await page.goto("/");
    await expect(page.locator(".map canvas")).toBeVisible({ timeout: 90_000 });
    await openBus(page);
    await expect(page.getByRole("button", { name: "Créer une ligne de bus" })).toBeEnabled({ timeout: 90_000 });
    await page.getByRole("button", { name: "Créer une ligne de bus" }).click();
    const creator = page.getByRole("region", { name: "Créer une ligne" });
    await expect(creator).toBeVisible();
    for (let i = 0; i < 2; i++) {
      await creator.getByRole("button", { name: "Placer", exact: true }).first().click();
      await creator.getByRole("button", { name: "Placer au centre de la carte" }).click();
    }
    await creator.getByRole("button", { name: "Valider les terminus et générer le tracé" }).click();
    await creator.getByRole("button", { name: "Valider le tracé et passer aux arrêts" }).click();
    await creator.getByLabel("Nom de la ligne").fill("Ligne test");
    await creator.getByRole("button", { name: "Ajouter un arrêt sur la carte" }).click();
    const first = await page.locator(".bus-line-marker--terminus").nth(0).boundingBox();
    const last = await page.locator(".bus-line-marker--terminus").nth(1).boundingBox();
    if (!first || !last) throw new Error("Terminaux invisibles");
    await page.locator(".map canvas").dispatchEvent("click", { clientX: (first.x + last.x + first.width) / 2, clientY: (first.y + last.y + first.height) / 2 });
    await creator.getByRole("button", { name: "Valider et terminer la ligne" }).click();
    await expect(page.getByText("La ligne « Ligne test » a été enregistrée.")).toBeVisible();
    await openBus(page);
    await page.getByRole("button", { name: /Administrer les lignes créées/ }).click();
    await page.getByRole("button", { name: "Modifier", exact: true }).click();
    await page.getByRole("button", { name: "Créer une variante à partir de ce parcours" }).click();
    await page.getByLabel("Nom de la variante").fill("Variante test");
    await page.getByLabel("Nom de l’arrêt 1").fill("Arrêt variante");
    await page.reload();
    await openBus(page);
    await page.getByRole("button", { name: /Administrer les lignes créées/ }).click();
    await page.getByRole("button", { name: "Modifier", exact: true }).click();
    await expect(page.getByLabel("Variante active").locator("option")).toHaveCount(2);
    await page.getByLabel("Variante active").selectOption({ label: "Variante test" });
    await expect(page.getByLabel("Nom de la variante")).toHaveValue("Variante test");
    const stored = await page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)!), key);
    expect(stored[0].name).toBe("Ligne test");
    expect(stored[0].variants[0].name).toBe("Variante test");
    expect(stored[0].arrets[0].name).toBe("Arrêt 1");
    expect(stored[0].variants[0].arrets[0].name).toBe("Arrêt variante");
  });
}

test("une erreur de stockage ne remplace pas la ligne enregistrée", async ({ page }) => {
  const old = [{ id: "ancienne", name: "Ancienne", termini: [{ id: "t1", kind: "terminus", name: "T1", coordinates: [6.12, 45.9] }, { id: "t2", kind: "terminus", name: "T2", coordinates: [6.13, 45.9] }], passages: [], arrets: [{ id: "a1", kind: "arret", name: "Arrêt", coordinates: [6.125, 45.9] }], geometry: [[6.12, 45.9], [6.13, 45.9]], distanceM: 800, warnings: [], updatedAt: "2026-01-01" }];
  await page.addInitScript(({ storageKey, value }) => localStorage.setItem(storageKey, JSON.stringify(value)), { storageKey: key, value: old });
  await page.goto("/");
  await expect(page.locator(".map canvas")).toBeVisible({ timeout: 90_000 });
  await openBus(page);
  await page.getByRole("button", { name: /Administrer les lignes créées/ }).click();
  await page.getByRole("button", { name: "Modifier", exact: true }).click();
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error("quota"); }; });
  await page.getByRole("button", { name: "Créer une variante à partir de ce parcours" }).click();
  await expect(page.locator(".bus-creator-error")).toContainText("Enregistrement impossible");
  expect(await page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)!), key)).toEqual(old);
});

test("un échec de calcul reste visible sans inventer de tracé", async ({ page }) => {
  await page.route("**/api/bus-route", (route) => route.fulfill({ status: 422, json: { status: "unavailable", warnings: ["Aucun parcours trouvé"] } }));
  await page.goto("/");
  await expect(page.locator(".map canvas")).toBeVisible({ timeout: 90_000 });
  await openBus(page);
  await page.getByRole("button", { name: "Créer une ligne de bus" }).click({ timeout: 90_000 });
  const creator = page.getByRole("region", { name: "Créer une ligne" });
  for (let i = 0; i < 2; i++) {
    await creator.getByRole("button", { name: "Placer", exact: true }).first().click();
    await creator.getByRole("button", { name: "Placer au centre de la carte" }).click();
  }
  await creator.getByRole("button", { name: "Valider les terminus et générer le tracé" }).click();
  await expect(creator.locator(".bus-creator-error")).toContainText("Aucun parcours trouvé");
  expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBeNull();
});

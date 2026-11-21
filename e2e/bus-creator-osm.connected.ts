import { test, expect, devices } from "@playwright/test";

test.use({ ...devices["iPhone 13"], browserName: "chromium", viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });

test("parcours tactile avec le routage OSM réel", async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  await page.goto("http://localhost:3001/");
  await expect(page.locator(".map canvas")).toBeVisible({ timeout: 90_000 });
  await page.getByRole("button", { name: "Menu Bus" }).tap();
  const create = page.getByRole("button", { name: "Créer une ligne de bus" });
  await expect(create).toBeEnabled({ timeout: 90_000 });
  await create.tap();
  await page.screenshot({ path: testInfo.outputPath("avant.png") });
  await page.touchscreen.tap(277, 653);
  await page.touchscreen.tap(300, 691);
  await expect(page.getByRole("button", { name: "Valider les terminus et générer le tracé" })).toBeVisible();
  const response = page.waitForResponse((item) => item.url().includes("/api/bus-route") && item.request().method() === "POST");
  await page.getByRole("button", { name: "Valider les terminus et générer le tracé" }).tap();
  const result = await (await response).json();
  console.log("REAL_ROUTE", JSON.stringify({ status: result.status, distanceM: result.distanceM, geometryPoints: result.geometry?.length, snaps: result.snaps, warnings: result.warnings }));
  await page.screenshot({ path: testInfo.outputPath("apres.png") });
  expect(result.status).toBe("candidate");
  await expect(page.getByText("Précisez le passage")).toBeVisible();
  await page.getByRole("button", { name: "Valider le tracé et passer aux arrêts" }).tap();
  await page.getByLabel("Nom de la ligne").fill("Essai tactile OSM");
  await page.getByRole("button", { name: "Ajouter un arrêt sur la carte" }).tap();
  await page.screenshot({ path: testInfo.outputPath("placement.png") });
  const first = await page.locator(".bus-line-marker--terminus").nth(0).boundingBox();
  const last = await page.locator(".bus-line-marker--terminus").nth(1).boundingBox();
  if (!first || !last) throw new Error("Marqueurs non visibles");
  await page.touchscreen.tap((first.x + last.x + first.width) / 2, (first.y + last.y + first.height) / 2);
  await expect(page.getByLabel("Nom de l’arrêt 1")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Valider et terminer la ligne" }).tap();
  await expect(page.getByText("La ligne « Essai tactile OSM » a été enregistrée.")).toBeVisible();
});

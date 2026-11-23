import { expect, test } from "@playwright/test";

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`bilan V2 et persistance sans API ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route("**/api/**", (route) => route.abort());
    await page.route("https://tiles.openfreemap.org/**", (route) => route.abort());
    await page.goto("/");
    await page.getByRole("button", { name: "Menu Bilan" }).click();
    const version = page.getByLabel("Version et périmètre du bilan");
    await expect(version).toHaveValue("v1");
    await version.selectOption("v2");
    await expect(page.getByRole("heading", { name: "Bilan V2 · toutes les lignes" })).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("Écart de kilomètres").locator("+ dd")).toHaveText("0 km");
    const line = page.locator("details.bilan-line").filter({ has: page.locator("summary").filter({ hasText: /^1 ·/ }) }).first();
    await line.locator("summary").first().click();
    await line.getByLabel("Modèle supposé en référence").selectOption("standard-diesel");
    await line.getByLabel("Modèle supposé en scénario").selectOption("standard-electric");
    await page.getByText("Facteurs modifiables et provenance").click();
    await page.getByRole("spinbutton", { name: /GES gazole/ }).fill("3.2");
    const factor = page.locator("details").filter({ has: page.locator("summary").filter({ hasText: /^Informations sur GES gazole$/ }) }).last();
    await factor.locator("summary").first().click();
    await factor.getByLabel("Origine déclarée").selectOption({ label: "Autre rapport" });
    await factor.getByLabel("Vérification déclarée").selectOption({ label: "À vérifier" });
    await factor.getByLabel("Source, date, périmètre et limites saisis").fill("Source de test, 2026");
    await page.getByRole("button", { name: "Enregistrer les affectations et facteurs" }).click();
    await expect(page.getByRole("status").filter({ hasText: "enregistrés" })).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "Menu Bilan" }).click();
    await page.getByLabel("Version et périmètre du bilan").selectOption("v2");
    const reopened = page.locator("details.bilan-line").filter({ has: page.locator("summary").filter({ hasText: /^1 ·/ }) }).first();
    await reopened.locator("summary").first().click();
    await expect(reopened.getByLabel("Modèle supposé en référence")).toHaveValue("standard-diesel");
    await expect(reopened.getByLabel("Modèle supposé en scénario")).toHaveValue("standard-electric");
    await page.getByText("Facteurs modifiables et provenance").click();
    const reopenedFactor = page.locator("details").filter({ has: page.locator("summary").filter({ hasText: /^Informations sur GES gazole$/ }) }).last();
    await reopenedFactor.locator("summary").first().click();
    await expect(reopenedFactor.getByLabel("Origine déclarée")).toHaveValue("Autre rapport");
    await expect(reopenedFactor.getByLabel("Vérification déclarée")).toHaveValue("À vérifier");
    await expect(reopenedFactor.getByLabel("Source, date, périmètre et limites saisis")).toHaveValue("Source de test, 2026");
    await page.evaluate(() => { const key = "yft.bus-report-v2.v1"; const saved = JSON.parse(localStorage.getItem(key)!); saved.scenario["1"] = "standard-diesel"; localStorage.setItem(key, JSON.stringify(saved)); });
    await page.getByRole("button", { name: "Enregistrer les affectations et facteurs" }).click();
    await expect(page.getByRole("status").filter({ hasText: "autre onglet" })).toBeVisible();
    await expect(reopened.getByLabel("Modèle supposé en scénario")).toHaveValue("standard-electric");
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("yft.bus-report-v2.v1")!).scenario["1"])).toBe("standard-diesel");
    await page.getByLabel("Version et périmètre du bilan").selectOption("selected");
    await expect(page.getByRole("heading", { name: "Bilan V2 · lignes sélectionnées" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("une ligne créée avec horaire alimente simulation et bilan", async ({ page }) => {
  await page.addInitScript(() => {
    const a = { id: "a", kind: "terminus", name: "A", coordinates: [6.12, 45.9] };
    const b = { id: "b", kind: "terminus", name: "B", coordinates: [6.13, 45.9] };
    const line = { id: "test-created", name: "Citoyenne test", termini: [a, b], passages: [], arrets: [], geometry: [a.coordinates, b.coordinates], distanceM: 800, warnings: [], updatedAt: "2026-11-04" };
    const entry = { id: "created:test", date: "2026-11-04", kind: "created", lineId: line.id, variantId: line.id, directionId: JSON.stringify([[a.id, a.coordinates], [b.id, b.coordinates]]), departure: 28800, stops: [{ id: "a", name: "A", offset: 0 }, { id: "b", name: "B", offset: 1200 }] };
    localStorage.setItem("yft.bus-created-lines.v1", JSON.stringify([line]));
    localStorage.setItem("yft.bus-terminus-schedules.v1", JSON.stringify({ version: 1, entries: [entry] }));
  });
  await page.route("**/api/**", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "Menu Bus" }).click();
  await page.getByRole("button", { name: "Simuler les lignes cochées", exact: true }).click();
  const simulation = page.getByRole("region", { name: "Simulation des lignes cochées" });
  await simulation.getByLabel("Horaires utilisés").selectOption("scenario");
  await simulation.getByLabel("Date").fill("2026-11-04");
  await simulation.getByLabel("Heure").fill("08:10:00");
  await simulation.getByRole("button", { name: "Démarrer" }).click();
  await expect(simulation.getByLabel("Bus simulés par ligne")).toContainText("Citoyenne test : 1");
  await page.getByRole("button", { name: "Menu Bilan" }).click();
  await page.getByLabel("Version et périmètre du bilan").selectOption("v2");
  const line = page.locator("details.bilan-line").filter({ has: page.locator("summary").filter({ hasText: /^Citoyenne test ·/ }) });
  await expect(line).toBeVisible();
  await line.locator("summary").first().click();
  await expect(line).toContainText("1 courses");
});

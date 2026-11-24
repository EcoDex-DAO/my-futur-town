import { expect, test } from "@playwright/test";

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`bilan explicite et valeurs inconnues ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route("**/api/**", (route) => route.abort());
    await page.route("https://tiles.openfreemap.org/**", (route) => route.abort());
    await page.goto("/");
    await page.getByRole("button", { name: "Menu Bilan" }).click();
    await expect(page.getByText(/année estimée jusqu.au 2027-11-03 en répétant les jours types observés/)).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/représentativité annuelle n’est pas établie/)).toBeVisible();
    await page.getByRole("spinbutton", { name: /Bus standard gazole/ }).fill("");
    await expect(page.locator(".bilan-totals").first().locator("div").filter({ has: page.getByText("Énergie", { exact: true }) }).locator("dd")).toHaveText("À renseigner");
    await expect(page.locator(".bilan-report")).toBeVisible();
  });
}

test("horaires indisponibles : message explicite sans bilan", async ({ page }) => {
  await page.route("**/data/sibra-schedule.json", (route) => route.abort());
  await page.route("https://tiles.openfreemap.org/**", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "Menu Bilan" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Horaires indisponibles" })).toBeVisible();
  await expect(page.locator(".bilan-totals")).toHaveCount(0);
});

test("courses non résolues signalées dans les agrégats", async ({ page }) => {
  await page.route("**/data/sibra-schedule.json", async (route) => {
    const response = await route.fetch();
    const schedule = await response.json();
    for (const trip of schedule.trips) trip.variantId = "inconnue";
    await route.fulfill({ json: schedule });
  });
  await page.route("https://tiles.openfreemap.org/**", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "Menu Bilan" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Résultats partiels/ })).toBeVisible({ timeout: 30000 });
  await expect(page.getByText("Résultats partiels : des courses non résolues sont exclues.").first()).toBeVisible();
});

test("calendrier incomplet : aucun total calculé", async ({ page }) => {
  await page.route("**/data/sibra-schedule.json", async (route) => {
    const response = await route.fetch();
    const schedule = await response.json();
    delete schedule.serviceDates[Object.keys(schedule.serviceDates)[0]];
    await route.fulfill({ json: schedule });
  });
  await page.route("https://tiles.openfreemap.org/**", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "Menu Bilan" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "calendrier incomplet" })).toBeVisible({ timeout: 30000 });
  await expect(page.locator(".bilan-totals")).toHaveCount(0);
});

test("accès clavier aux hypothèses et à leur source", async ({ page }) => {
  await page.route("https://tiles.openfreemap.org/**", (route) => route.abort());
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Menu Bilan" });
  await menu.focus();
  await page.keyboard.press("Enter");
  const details = page.getByText("Informations sur Bus standard gazole", { exact: true });
  await expect(details).toBeVisible({ timeout: 30000 });
  await details.focus();
  await page.keyboard.press("Enter");
  const info = details.locator("..");
  await expect(info.getByRole("link", { name: "Rapport SIBRA 2024, consommations" })).toBeVisible();
  await expect(info.getByLabel("Origine déclarée")).toBeVisible();
  await page.getByRole("spinbutton", { name: /Bus standard gazole/ }).fill("40");
  await expect(info.getByRole("link", { name: "Rapport SIBRA 2024, consommations" })).toHaveCount(0);
  await expect(info.getByText(/source initiale ne s.applique pas automatiquement/)).toBeVisible();
  await page.getByRole("spinbutton", { name: /Bus standard gazole/ }).fill("38.4");
  await expect(info.getByRole("link", { name: "Rapport SIBRA 2024, consommations" })).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Menu Bilan" }).click();
  const reopened = page.getByText("Informations sur Bus standard gazole", { exact: true });
  await reopened.click();
  await expect(reopened.locator("..").getByRole("link", { name: "Rapport SIBRA 2024, consommations" })).toHaveCount(0);
});

test("une ancienne sauvegarde est conservée sans inventer sa provenance", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("bus-report-v1", JSON.stringify({ parameters: { standard: "38.4" }, sources: { standard: "Source personnelle" }, sourceKinds: { standard: "Autre rapport" }, sourceChecks: { standard: "À vérifier" } })));
  await page.route("https://tiles.openfreemap.org/**", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "Menu Bilan" }).click();
  const field = page.getByRole("spinbutton", { name: /Bus standard gazole/ });
  await expect(field).toHaveValue("38.4", { timeout: 30000 });
  const summary = page.getByText("Informations sur Bus standard gazole", { exact: true });
  await summary.click();
  const info = summary.locator("..");
  await expect(info.getByLabel("Source, date, périmètre et limites saisis")).toHaveValue("Source personnelle");
  await expect(info.getByLabel("Origine déclarée")).toHaveValue("Autre rapport");
  await expect(info.getByText(/source initiale ne s.applique pas automatiquement/)).toBeVisible();
  await expect(info.getByRole("link", { name: "Rapport SIBRA 2024, consommations" })).toHaveCount(0);
});

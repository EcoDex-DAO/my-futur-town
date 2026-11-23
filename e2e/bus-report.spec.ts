import { expect, test } from "@playwright/test";

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`bilan explicite et valeurs inconnues ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route("**/api/**", (route) => route.abort());
    await page.route("https://tiles.openfreemap.org/**", (route) => route.abort());
    await page.goto("/");
    await page.getByRole("button", { name: "Menu Bilan" }).click();
    await expect(page.getByText(/extrapolation uniforme à 365 jours/)).toBeVisible({ timeout: 30000 });
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

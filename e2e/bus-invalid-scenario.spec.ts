import { expect, test } from "@playwright/test";

for (const width of [1440, 390]) test(`scénario invalide conserve la référence ${width}px`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width, height: 844 });
  await page.addInitScript(() => localStorage.setItem("yft.bus-weekly-timetables.v1", JSON.stringify({ version: 1, tables: [{ id: "bad", kind: "gtfs", lineId: "1", variantId: "v", directionId: "0", tripId: "absent", stops: [{ id: "a", name: "A", offset: 0 }, { id: "b", name: "B", offset: 600 }], validFrom: "2026-11-04", validTo: "2026-11-04", days: { weekday: [28800], saturday: [], "sunday-holiday": [] } }] })));
  await page.route("https://tiles.openfreemap.org/styles/liberty", (route) => route.fulfill({ json: { version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#e5eee8" } }] } }));
  await page.route("**/data/sibra.json", (route) => route.fulfill({ json: { metadata: { sourceUrl: "fixture", attribution: "fixture", license: "fixture", validFrom: "2026-11-04", validTo: "2026-11-04", generatedAt: "2026-11-01" }, lines: [{ id: "1", shortName: "1", longName: "Test", color: "#004433", variants: [{ id: "v", headsign: "B", coordinates: [[6.12, 45.9], [6.13, 45.9]], stops: [{ id: "a", name: "A", coordinates: [6.12, 45.9] }, { id: "b", name: "B", coordinates: [6.13, 45.9] }] }] }] } }));
  await page.route("**/data/sibra-schedule.json", (route) => route.fulfill({ json: { metadata: { validFrom: "2026-11-04", validTo: "2026-11-04", timeZone: "Europe/Paris" }, serviceDates: { "2026-11-04": ["s"] }, trips: [{ id: "base", lineId: "1", variantId: "v", directionId: "0", serviceId: "s", stops: [{ stopId: "a", arrival: 28800, departure: 28800, progress: 0 }, { stopId: "b", arrival: 29400, departure: 29400, progress: 1 }] }] } }));
  await page.route("**/api/**", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "Menu Bilan" }).click();
  await page.getByLabel("Version et périmètre du bilan").selectOption("v2");
  await expect(page.getByRole("alert").filter({ hasText: /Modèle du tableau GTFS absent ou modifié ; référence conservée/ })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Écart de kilomètres").locator("+ dd")).toHaveText("0 km");
  await page.getByRole("button", { name: "Menu Bus" }).click();
  await page.getByRole("button", { name: "Simuler les lignes cochées", exact: true }).click();
  const simulation = page.getByRole("region", { name: "Simulation des lignes cochées" });
  await simulation.getByLabel("Horaires utilisés").selectOption("scenario");
  await simulation.getByLabel("Date").fill("2026-11-04");
  await simulation.getByLabel("Heure").fill("08:05:00");
  await simulation.getByRole("button", { name: "Démarrer" }).click();
  await expect(simulation.getByLabel("Bus simulés par ligne")).toContainText("1 : 1");
  await page.reload();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("yft.bus-weekly-timetables.v1")!).tables[0].tripId)).toBe("absent");
});

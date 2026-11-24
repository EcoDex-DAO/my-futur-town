import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

for (const width of [1440, 390]) test(`restriction GTFS d'un arrêt réel ${width}px`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width, height: 844 });
  await page.route("https://tiles.openfreemap.org/styles/liberty", (route) => route.fulfill({ json: { version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#e5eee8" } }] } }));
  // The real GTFS stop/trips and constraints are retained. Move its map marker
  // to the initial centre only, so the same stop can be clicked on either viewport.
  const data = JSON.parse(readFileSync("public/data/sibra.json", "utf8"));
  const line = data.lines.find((item: { id: string }) => item.id === "15");
  line.variants = line.variants.filter((item: { id: string }) => item.id === "15:935c917e24907699");
  for (const stop of line.variants[0].stops) if (stop.id === "0:2COLL") stop.coordinates = [6.1294, 45.8992];
  data.lines = [line];
  await page.route("**/data/sibra.json", (route) => route.fulfill({ json: data }));
  await page.goto("/");
  const map = page.locator(".map canvas");
  await expect(map).toBeVisible();
  await expect.poll(async () => page.locator(".notice").count(), { timeout: 30_000 }).toBe(0);
  await map.click({ position: { x: (await map.boundingBox())!.width / 2, y: (await map.boundingBox())!.height / 2 } });
  const panel = page.getByLabel("Informations bus");
  await expect(panel.getByRole("heading", { name: /Arrêt ST JORIOZ COLLEGE/i })).toBeVisible({ timeout: 30_000 });
  await panel.getByLabel("Jour de service").fill("2026-11-05");
  await panel.getByLabel("Direction").selectOption({ label: "Vers ST JORIOZ COLLEGE" });
  const restriction = panel.locator("td span").filter({ hasText: "30:50" }).locator("sup[aria-label]").filter({ hasText: "M−" });
  await expect(restriction.first()).toHaveAttribute("aria-label", /montée interdite.*estimé ou interpolé/);
  await expect(panel.getByText(/M− : montée interdite/)).toBeVisible();
  await expect(panel.getByRole("link", { name: "Source GTFS SIBRA" })).toHaveAttribute("href", /20261106\.081009\.206313\.zip$/);
});

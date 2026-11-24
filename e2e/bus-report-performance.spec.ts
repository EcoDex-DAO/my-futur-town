import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test.skip(process.env.MFT_BENCHMARK !== "1", "Mesure de performance volontaire");

test("mesure le bilan annuel avec une course GTFS modifiée", async ({ page }) => {
  test.setTimeout(180_000);
  const schedule = JSON.parse(readFileSync("public/data/sibra-schedule.json", "utf8"));
  const date = "2026-11-04";
  const trip = schedule.trips.find((item: { serviceId: string }) => schedule.serviceDates[date].includes(item.serviceId));
  const departure = trip.stops[0].departure;
  const entry = { id: `gtfs:${date}:${trip.id}`, date, kind: "gtfs", lineId: trip.lineId, variantId: trip.variantId, directionId: trip.directionId, tripId: trip.id, departure: departure + 60, stops: trip.stops.map((stop: { stopId: string; departure: number }) => ({ id: stop.stopId, name: stop.stopId, offset: stop.departure - departure })) };
  await page.addInitScript((value) => localStorage.setItem("yft.bus-terminus-schedules.v1", JSON.stringify({ version: 1, entries: [value] })), entry);
  await page.route("https://tiles.openfreemap.org/**", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "Menu Bilan" }).click();
  const before = Date.now();
  await page.getByLabel("Version et périmètre du bilan").selectOption("v2");
  await expect(page.getByRole("heading", { name: "Bilan V2 · toutes les lignes" })).toBeVisible({ timeout: 120_000 });
  console.log(`BILAN_V2_MODIFIE_MS ${Date.now() - before}`);
  await expect(page.getByText("Bilan annuel estimé", { exact: false })).toBeVisible();
});

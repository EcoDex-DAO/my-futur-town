import { expect, test } from "@playwright/test";

test("sélectionne un arrêt au clavier et affiche ses prochains passages théoriques", async ({ page }) => {
  await page.route("**/health", (route) => route.abort());
  await page.goto("/");

  const simulation = page.locator(".bus-simulation");
  await expect(simulation.getByLabel("Date")).toHaveValue("2026-11-04", { timeout: 60_000 });
  await expect(simulation.getByLabel("Heure")).toHaveValue("07:49:00");

  await page.getByRole("button", { name: /Ligne 1 - Poisy College Lycee/ }).click();
  const stop = page.locator(".sibra-stop-list button").filter({ hasText: /^POISY$/ });
  await expect(stop).toBeVisible();
  await stop.focus();
  await stop.press("Enter");

  const timetable = page.locator(".sibra-timetable");
  await expect(timetable.getByRole("heading", { name: "Prochains passages" })).toBeVisible();
  await expect(timetable.locator(".sibra-passage-list li").first()).toBeVisible({ timeout: 60_000 });
  await expect(timetable.locator(".sibra-passage-list li")).toHaveCount(6);
  await expect(timetable).toContainText("Sens 0");
  await expect(page.locator(".sibra-stop-list button[aria-pressed=true]")).toHaveText("POISY");
});

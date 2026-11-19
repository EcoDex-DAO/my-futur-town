import { expect, test } from "@playwright/test";

test("estime les flux par mode et transfère explicitement l’offre GTFS", async ({ page }) => {
  await page.route("**/health", (route) => route.abort());
  await page.route("**/api/**", (route) => route.abort());
  await page.route("https://tiles.openfreemap.org/**", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "Menu Scénarios multimodaux" }).click();
  await page.getByRole("button", { name: "Nouveau scénario" }).click();

  for (const [label, value] of [
    ["Places de stationnement", "100"],
    ["Taux d’occupation moyen", "1"],
    ["Rotations par jour", "1"],
    ["Part des arrivées pendant l’heure", "0.5"],
    ["Personnes par voiture", "2"],
    ["Part prenant le bus", "0.5"],
    ["Départs existants par heure", "9"],
  ]) {
    await page.getByRole("spinbutton", { name: label }).fill(value);
  }
  await page.getByRole("spinbutton", { name: "Part prenant le vélo" }).fill("0.2");
  await page.getByRole("spinbutton", { name: "Part marchant à pied" }).fill("0.2");
  const split = page.getByRole("region", { name: "Répartition des voyageurs du parking" });
  for (const [label, value] of [
    ["Voyageurs arrivant au parking / heure", "100"],
    ["Bus / heure", "50"],
    ["Vélo / heure", "20"],
    ["Marche / heure", "20"],
    ["Autres ou non affectés / heure", "10"],
  ]) {
    await expect(split.locator("div").filter({ has: page.getByText(label, { exact: true }) }).locator("dd")).toHaveText(value);
  }
  await page.getByRole("spinbutton", { name: "Part prenant le vélo" }).fill("0.9");
  await expect(split.getByText("La somme des parts connues ne peut pas dépasser 1.")).toBeVisible();
  await page.getByRole("spinbutton", { name: "Part prenant le vélo" }).fill("0.2");

  await page.getByText("Consulter l’offre bus SIBRA", { exact: true }).click();
  const offer = page.getByRole("region", { name: "Offre bus théorique SIBRA" });
  await expect(offer.getByLabel("Ligne GTFS")).toBeVisible({ timeout: 30_000 });
  await expect(offer.getByLabel("Arrêt GTFS")).toHaveValue("0:1TRE");
  await offer.getByLabel("Ligne GTFS").selectOption("27");
  await offer.getByLabel("Sens GTFS").selectOption("0");
  await offer.getByLabel("Jour de service GTFS").fill("2026-11-17");
  await offer.getByLabel("Heure de départ GTFS").selectOption("8");
  await expect(offer.getByText("2 passage(s) théorique(s)")).toBeVisible();
  const apply = offer.getByRole("button", { name: "Utiliser ces passages pour le calcul bus" });
  await expect(apply).toBeDisabled();
  const departures = page.getByRole("spinbutton", { name: "Départs existants par heure" });
  await expect(departures).toHaveValue("9");
  await offer.getByRole("checkbox", { name: /tronçon critique étudié/ }).check();
  await apply.click();
  await expect(departures).toHaveValue("2");
  const assumption = departures.locator("xpath=ancestor::div[contains(@class,'multimodal-assumption')]");
  await assumption.locator("summary").click();
  await expect(page.getByLabel("Nature — Départs existants par heure")).toHaveValue("assumed");
  await expect(page.getByLabel("Source — Départs existants par heure")).toHaveValue(/offre-de-transports-sibra/);
  await expect(page.getByLabel("Date — Départs existants par heure")).toHaveValue("");
  await expect(page.getByLabel("Périmètre — Départs existants par heure")).toHaveValue(/2026-11-17/);
  await offer.getByLabel("Jour de service GTFS").fill("2027-01-01");
  await expect(offer.getByText(/Horaires indisponibles pour ce jour/)).toBeVisible();
  await expect(departures).toHaveValue("2");
  await expect(offer.getByRole("button", { name: "Utiliser ces passages pour le calcul bus" })).toHaveCount(0);
});

import { expect, test } from "@playwright/test";

for (const width of [1440, 390]) {
  test(`estimation simple et sauvegarde à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.route("**/data/sibra.json", (route) => route.fulfill({ json: { metadata: { sourceUrl: "fixture", attribution: "fixture", license: "fixture", validFrom: "2026-01-01", validTo: "2026-12-31", generatedAt: "2026-01-01" }, lines: [] } }));
    await page.route("https://tiles.openfreemap.org/styles/liberty", (route) => route.fulfill({ json: { version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#e5eee8" } }] } }));
    await page.addInitScript(() => {
      if (!localStorage.getItem("mft-tresums-projects-v1")) localStorage.setItem("mft-tresums-projects-v1", JSON.stringify({ version: 1, projects: [{ id: "p", name: "Projet test", parking: null, flows: [], zone: { kind: "polygon", points: [[6.13,45.89],[6.131,45.89],[6.131,45.891],[6.13,45.891]] } }] }));
      if (!localStorage.getItem("mft-access-reference-v1:p")) localStorage.setItem("mft-access-reference-v1:p", JSON.stringify({ version: 1, accesses: [] }));
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Chargement de la carte d’Annecy…")).toBeHidden({ timeout: 60000 });
    await page.getByRole("button", { name: "Menu Trésums" }).click();
    const panel = page.getByRole("region", { name: "Étape 2 : surface et capacité" });
    await expect(panel.getByText("Surface de la zone :", { exact: false })).toContainText("m²");
    await expect(panel.getByText("Estimation théorique :", { exact: false })).toContainText("places");
    await panel.getByRole("heading", { name: "2. Surface et capacité" }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `specs/039-parcours-simple/captures/parcours-${width}.png` });
    await panel.getByText("Modifier les hypothèses").click();
    await panel.getByLabel("Part utilisable de la zone (%)").fill("50");
    await panel.getByRole("button", { name: "Enregistrer l’estimation" }).click();
    await expect(panel.getByText("Estimation enregistrée dans ce navigateur.")).toBeVisible();
    const saved = JSON.parse((await page.evaluate(() => localStorage.getItem("mft-parking-reference-v1:p")))!);
    expect(saved).toMatchObject({ version: 6, kind: "estimate", estimateMode: "zone", usablePercent: "50" });
    expect(saved.savedRatio.total).toBeGreaterThan(0);
    expect(await page.evaluate(() => localStorage.getItem("mft-access-reference-v1:p"))).toContain("accesses");
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText("Chargement de la carte d’Annecy…")).toBeHidden({ timeout: 60000 });
    const menu = page.getByRole("button", { name: "Menu Trésums" });
    if (await menu.getAttribute("aria-expanded") !== "true") await menu.click();
    await expect(page.getByText("Dernière estimation enregistrée :", { exact: false })).toContainText(`${saved.savedRatio.total} places`);
    const other = await page.context().newPage();
    await other.goto("/health");
    const external = JSON.stringify({ ...saved, assumptions: "modification concurrente" });
    await other.evaluate((raw) => localStorage.setItem("mft-parking-reference-v1:p", raw), external);
    await page.getByRole("button", { name: "Enregistrer l’estimation" }).click();
    await expect(page.getByText("Le projet ou la capacité a changé", { exact: false })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("mft-parking-reference-v1:p"))).toBe(external);
    await other.close();
  });
}

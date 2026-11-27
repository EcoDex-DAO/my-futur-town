import { expect, test } from "@playwright/test";

for (const width of [1440, 390]) {
  test(`capacité et accès migrés à ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.route("https://tiles.openfreemap.org/styles/liberty", (route) => route.fulfill({ json: { version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#e5eee8" } }] } }));
    await page.addInitScript(() => {
      if (!localStorage.getItem("mft-tresums-projects-v1")) localStorage.setItem("mft-tresums-projects-v1", JSON.stringify({ version: 1, projects: [{ id: "p", name: "Projet test", parking: null, flows: [], zone: { kind: "polygon", points: [[6.13,45.89],[6.131,45.89],[6.131,45.891],[6.13,45.891]] } }] }));
      if (!localStorage.getItem("mft-access-reference-v1:p")) localStorage.setItem("mft-access-reference-v1:p", JSON.stringify({ version: 2, accesses: [{ id: "a", name: "Borne", position: [6.13,45.89], direction: "both", directionDetails: "ancien sens", origin: "unknown", source: "", date: "", notes: "", parking: { enabled: "yes", pedestrian: "conditional", bicycle: "unknown", vehicle: "prohibited", condition: "badge" }, street: { enabled: "unknown", pedestrian: "unknown", bicycle: "unknown", vehicle: "unknown", condition: "" } }] }));
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Menu Trésums" }).click();
    await page.getByText("Parking actuel · capacité de référence").click();
    await expect(page.getByText("Surface de la zone confirmée :", { exact: false })).toContainText("m²");
    await page.getByLabel("Nature de la donnée").selectOption("estimate");
    await expect(page.getByText("Estimation :", { exact: false })).toContainText("ordinaires");
    await page.getByLabel("Part de la zone utilisable (%)").fill("50");
    await page.getByLabel("Source ou origine de la saisie").fill("Hypothèse test");
    await page.getByLabel("Date de la donnée ou de l’estimation").fill("2026-11-27");
    await page.getByLabel("Hypothèses et limites").fill("Test");
    await page.screenshot({ path: `/tmp/parking-reference-${width}.png` });
    await page.getByRole("button", { name: "Enregistrer la capacité" }).click();
    await expect(page.getByText("Référence enregistrée dans ce navigateur.")).toBeVisible();
    await page.getByText("Accès de référence", { exact: true }).click();
    await page.getByRole("button", { name: "Borne" }).click();
    const edit = page.getByRole("region", { name: "Modifier un accès" });
    await expect(edit.getByLabel("Entrée", { exact: true })).toBeChecked();
    await expect(edit.getByLabel("Sortie", { exact: true })).toBeChecked();
    await edit.getByLabel("Droite").check();
    await expect(edit.getByLabel("Condition pour piétons")).toHaveValue("badge");
    await expect(edit.getByText("Règle enregistrée : passage interdit.", { exact: false })).toBeVisible();
    await edit.getByRole("button", { name: "Enregistrer l’accès" }).click();
    const saved = JSON.parse((await page.evaluate(() => localStorage.getItem("mft-access-reference-v1:p")))!);
    expect(saved.accesses[0]).toMatchObject({ exitRight: true, directionDetails: "ancien sens", parking: { vehicle: "prohibited", modeConditions: { pedestrian: "badge" } } });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Menu Trésums" }).click();
    await page.getByText("Parking actuel · capacité de référence").click();
    await expect(page.getByLabel("Part de la zone utilisable (%)")).toHaveValue("50");
  });
}

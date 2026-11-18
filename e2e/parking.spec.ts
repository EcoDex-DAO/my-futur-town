import { expect, test } from "@playwright/test";

test("estimation et aperçu du parking restent propres au scénario", async ({ page }, testInfo) => {
  test.setTimeout(600_000);
  await page.setViewportSize({ width: 900, height: 700 });
  await page.route("**/health", (route) => route.abort());
  await page.route("**/api/**", (route) => route.abort());
  await page.route("https://tiles.openfreemap.org/styles/liberty", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#e8eee9" } }] }),
  }));
  await page.goto("/");
  await page.getByRole("button", { name: "Menu Scénarios multimodaux" }).click();
  await page.getByRole("button", { name: "Nouveau scénario" }).click();
  await page.getByLabel("Nom du scénario").fill("Parking de test");
  await page.getByRole("spinbutton", { name: /Niveaux hors sol/ }).fill("3");
  await page.getByRole("spinbutton", { name: /Hauteur par niveau/ }).fill("3");
  await page.getByRole("spinbutton", { name: /Surface de stationnement par niveau/ }).fill("1000");
  await page.getByRole("spinbutton", { name: /Surface par place avec circulation/ }).fill("25");
  await expect(page.getByText("120 places")).toBeVisible();
  await expect(page.getByText("9 m", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Utiliser la capacité pour le calcul bus" }).click();
  await expect(page.getByRole("spinbutton", { name: "Places de stationnement" })).toHaveValue("120");
  await page.getByRole("button", { name: "Enregistrer les scénarios" }).click();
  await page.getByRole("button", { name: "Afficher le volume sur la carte" }).click();
  await expect(page.getByRole("button", { name: "Menu Scénarios multimodaux" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByText("Volume indicatif sur le contour OSM", { exact: false })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("parking-desktop.png") });
  await page.getByRole("button", { name: "Menu Scénarios multimodaux" }).click();
  await page.getByRole("button", { name: "Dupliquer" }).click();
  await page.getByRole("spinbutton", { name: /Niveaux hors sol/ }).fill("4");
  await expect(page.getByText("160 places")).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer les scénarios" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Menu Scénarios multimodaux" }).click();
  await expect(page.getByLabel("Scénario actif").locator("option")).toHaveCount(2);
  await expect(page.getByText("120 places")).toBeVisible();
  await page.getByLabel("Scénario actif").selectOption({ label: "Parking de test (copie)" });
  await expect(page.getByText("160 places")).toBeVisible();
});

test("aperçu du parking sur mobile", async ({ page }, testInfo) => {
  test.setTimeout(360_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/health", (route) => route.abort());
  await page.route("**/api/**", (route) => route.abort());
  await page.route("https://tiles.openfreemap.org/styles/liberty", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#e8eee9" } }] }),
  }));
  await page.goto("/");
  await page.getByRole("button", { name: "Menu Scénarios multimodaux" }).click();
  await page.getByRole("button", { name: "Nouveau scénario" }).click();
  await page.getByRole("spinbutton", { name: /Niveaux hors sol/ }).fill("2");
  await page.getByRole("spinbutton", { name: /Hauteur par niveau/ }).fill("3");
  await page.getByRole("button", { name: "Afficher le volume sur la carte" }).click();
  await expect(page.getByText("Volume indicatif sur le contour OSM", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Menu Scénarios multimodaux" })).toHaveAttribute("aria-expanded", "false");
  await page.screenshot({ path: testInfo.outputPath("parking-mobile.png") });
});

import { expect, test } from "@playwright/test";

test("les valeurs moyennes du parking restent modifiables sans sauvegarde automatique", async ({ page }) => {
  await page.route("**/health", (route) => route.abort());
  await page.route("**/api/**", (route) => route.abort());
  await page.route("https://tiles.openfreemap.org/styles/liberty", (route) => route.fulfill({
    json: {
      version: 8,
      sources: {},
      layers: [{ id: "background", type: "background", paint: { "background-color": "#e8eee9" } }],
    },
  }));

  await page.goto("/");
  const menu = page.getByRole("button", { name: "Menu Scénarios multimodaux" });
  await menu.click();
  await page.getByRole("button", { name: "Nouveau scénario" }).click();

  const levels = page.getByRole("spinbutton", { name: /Niveaux hors sol/ });
  const height = page.getByRole("spinbutton", { name: /Hauteur par niveau/ });
  const area = page.getByRole("spinbutton", { name: /Surface de stationnement par niveau/ });
  const ratio = page.getByRole("spinbutton", { name: /Surface par place avec circulation/ });
  const busParking = page.getByRole("spinbutton", { name: "Places de stationnement" });
  const preset = page.getByRole("button", { name: "Utiliser les valeurs moyennes" });
  const volume = page.getByText("Volume indicatif sur le contour OSM", { exact: false });

  for (const field of [levels, height, area, ratio]) {
    await expect(field).toHaveValue("");
  }
  await expect(volume).toHaveCount(0);
  await expect(page.getByText("La carte est en cours de chargement", { exact: false })).toBeHidden();
  await preset.click();
  await expect(volume).toBeVisible();
  await expect(menu).toHaveAttribute("aria-expanded", "false");

  await menu.click();
  await expect(levels).toHaveValue("3");
  await expect(height).toHaveValue("3");
  await expect(area).toHaveValue("5300");
  await expect(ratio).toHaveValue("25");
  await expect(page.getByText("636 places", { exact: true })).toBeVisible();
  await expect(page.getByText("9 m", { exact: true })).toBeVisible();
  await expect(busParking).toHaveValue("");

  await page.locator("summary").filter({ hasText: "Source — Niveaux hors sol" }).click();
  await expect(page.getByLabel("Nature — Niveaux hors sol")).toHaveValue("assumed");
  await levels.fill("4");
  await expect(page.getByLabel("Nature — Niveaux hors sol")).toHaveValue("unknown");
  await expect(page.getByLabel("Source — Niveaux hors sol")).toHaveValue("");
  await expect(page.getByText("848 places", { exact: true })).toBeVisible();
  await expect(page.getByText("12 m", { exact: true })).toBeVisible();

  const [confirmation] = await Promise.all([
    page.waitForEvent("dialog").then(async (dialog) => {
      const confirmation = { type: dialog.type(), message: dialog.message() };
      await dialog.dismiss();
      return confirmation;
    }),
    preset.click(),
  ]);
  expect(confirmation.type).toBe("confirm");
  expect(confirmation.message).toContain("Remplacer les paramètres du parking");
  await expect(levels).toHaveValue("4");
  await expect(page.getByText("848 places", { exact: true })).toBeVisible();
  await expect(volume).toBeVisible();
  await page.getByRole("button", { name: "Masquer le volume" }).click();
  await expect(volume).toHaveCount(0);
  await page.getByRole("button", { name: "Nouveau scénario" }).click();
  if (!await page.getByLabel("Source — Niveaux hors sol").isVisible()) {
    await page.locator("summary").filter({ hasText: "Source — Niveaux hors sol" }).click();
  }
  await page.getByLabel("Source — Niveaux hors sol").fill("Note utilisateur");
  const [metadataConfirmation] = await Promise.all([
    page.waitForEvent("dialog").then(async (dialog) => { const type = dialog.type(); await dialog.dismiss(); return type; }),
    preset.click(),
  ]);
  expect(metadataConfirmation).toBe("confirm");
  await expect(page.getByLabel("Source — Niveaux hors sol")).toHaveValue("Note utilisateur");
  expect(await page.evaluate(() => localStorage.getItem("yft:multimodal-bus-scenarios:v1"))).toBeNull();
});

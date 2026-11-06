import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const required = ["YFT_TEST_EMAIL", "YFT_TEST_PASSWORD", "YFT_TEST_ROAD_ID"];

test("real imported road persists as a private scenario after browser reload and can be restored", async ({
  page,
}) => {
  for (const key of required)
    if (!process.env[key])
      throw new Error(
        "Use scripts/test-connected-roads.py to provision a temporary test identity securely.",
      );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByLabel("Sélectionner un tronçon")).toBeVisible({
    timeout: 30000,
  });
  await page
    .getByLabel("E-mail", { exact: true })
    .fill(process.env.YFT_TEST_EMAIL!);
  await page
    .getByLabel("Mot de passe", { exact: true })
    .fill(process.env.YFT_TEST_PASSWORD!);
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  await expect(page.getByLabel("Nom du scénario")).toBeVisible();
  await page
    .getByLabel("Nom du scénario")
    .fill("Test technique temporaire YFT");
  await page
    .getByRole("button", { name: "Créer le scénario", exact: true })
    .click();
  const scenarioSelect = page.getByLabel("Scénario enregistré");
  await expect(scenarioSelect).not.toHaveValue("");
  const scenarioId = await scenarioSelect.inputValue();
  await page
    .getByLabel("Sélectionner un tronçon")
    .selectOption(process.env.YFT_TEST_ROAD_ID!);
  await expect(
    page.getByLabel("Sens de circulation", { exact: true }),
  ).toBeVisible({ timeout: 10000 });
  await page
    .getByLabel("Sens de circulation", { exact: true })
    .selectOption("forward");
  await page.getByLabel("Nombre de voies", { exact: true }).fill("1");
  await page.getByLabel("Largeur totale (m)", { exact: true }).fill("9");
  await page.getByLabel("Largeur par voie auto (m)", { exact: true }).fill("3");
  await page
    .getByLabel("Largeur cyclable totale (m)", { exact: true })
    .fill("2");
  await page
    .getByLabel("Largeur totale des trottoirs (m)", { exact: true })
    .fill("2");
  await page
    .getByRole("button", { name: "Enregistrer le tronçon", exact: true })
    .click();
  await expect(
    page.getByText("Modification enregistrée. La référence reste intacte.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await page.getByLabel("Scénario enregistré").selectOption(scenarioId);
  await page
    .getByLabel("Sélectionner un tronçon")
    .selectOption(process.env.YFT_TEST_ROAD_ID!);
  await expect(
    page.getByLabel("Sens de circulation", { exact: true }),
  ).toHaveValue("forward");
  await expect(
    page.getByLabel("Largeur cyclable totale (m)", { exact: true }),
  ).toHaveValue("2");
  await page.getByLabel("Comparer : afficher la référence").check();
  await expect(
    page.getByLabel("Sens de circulation", { exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Comparer : afficher la référence").uncheck();
  await page
    .getByRole("button", { name: "Restaurer ce tronçon", exact: true })
    .click();
  await expect(
    page.getByText("Modification retirée du scénario ; référence restaurée.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Sens de circulation", { exact: true }),
  ).toHaveValue("both");
  await page.reload();
  await page.getByLabel("Scénario enregistré").selectOption(scenarioId);
  await page
    .getByLabel("Sélectionner un tronçon")
    .selectOption(process.env.YFT_TEST_ROAD_ID!);
  await expect(
    page.getByLabel("Sens de circulation", { exact: true }),
  ).toHaveValue("both");
  await page
    .getByRole("button", { name: "Supprimer ce scénario", exact: true })
    .click();
  await expect(page.getByLabel("Nom du scénario")).toBeVisible();
  await expect(page.locator(".notice[role=alert]")).toHaveCount(0);
  const version = await (await page.request.get("/version.json")).json();
  const packageVersion = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  ).version;
  expect(version.version).toBe(packageVersion);
  await page.getByRole("button", { name: "Informations de version" }).click();
  await expect(page.getByRole("dialog")).toContainText(version.revision);
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  expect(errors).toEqual([]);
});

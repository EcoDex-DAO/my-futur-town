import { expect, test } from "@playwright/test";

// Run only against a separate build made with the fake URL below. No Supabase
// request may reach a real service: every request is intercepted by Playwright.
test("une voirie simulée est associée, rouverte et refuse un autre propriétaire", async ({ page }) => {
  test.skip(process.env.MFT_SUPABASE_MOCK !== "1", "Nécessite le build isolé avec le faux service Supabase.");
  const owner = "00000000-0000-4000-8000-000000000001";
  const roadId = "00000000-0000-4000-8000-000000000002";
  const layerId = "00000000-0000-4000-8000-000000000003";
  const user = { id: owner, aud: "authenticated", role: "authenticated", email: "test@example.invalid", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
  const token = `${Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: owner, role: "authenticated", exp: 4102444800 })).toString("base64url")}.signature`;
  await page.addInitScript(({ token, user }) => {
    const key = "sb-mock-supabase-auth-token";
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ access_token: token, refresh_token: "mock-refresh", token_type: "bearer", expires_at: 4102444800, expires_in: 3600, user }));
  }, { token, user });
  await page.route("https://mock-supabase.invalid/**", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,OPTIONS" } });
      return;
    }
    const path = new URL(route.request().url()).pathname;
    let data: unknown;
    if (path.endsWith("/geo_layers")) data = [{ id: layerId, name: "Routes de test", slug: "annecy-roads-test", metadata: { version: "v-test", segments: 0 } }];
    else if (path.endsWith("/scenarios")) data = [{ id: roadId, name: "Voirie de test", reference_layer_id: layerId, reference_version: "v-test", updated_at: "2026-01-01T00:00:00Z" }];
    else if (path.endsWith("/yft_road_features")) data = { type: "FeatureCollection", features: [] };
    else if (path.endsWith("/scenario_changes") || path.endsWith("/yft_road_graph")) data = [];
    else if (path.endsWith("/user")) data = user;
    else throw new Error(`Requête Supabase simulée inattendue : ${path}`);
    await route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" }, contentType: "application/json", body: JSON.stringify(data) });
  });
  await page.route("**/health", (route) => route.abort());
  await page.route("https://tiles.openfreemap.org/**", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "Menu Scénarios multimodaux" }).click();
  await page.getByText("Éditeur de voirie", { exact: true }).first().click();
  const roadSelect = page.getByLabel("Scénario enregistré");
  await expect(roadSelect.locator("option")).toHaveCount(2);
  await roadSelect.selectOption(roadId);
  await page.getByRole("button", { name: "Nouveau scénario" }).click();
  await page.getByLabel("Nom du scénario").fill("Scénario de test");
  await page.getByRole("button", { name: "Associer la voirie sélectionnée" }).click();
  await expect(page.getByText("Voirie liée : Voirie de test · référence v-test")).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer les scénarios" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Menu Scénarios multimodaux" }).click();
  await page.getByRole("button", { name: "Ouvrir la voirie liée" }).click();
  await expect(page.getByText("La voirie liée est ouverte dans l’éditeur.")).toBeVisible();
  await expect(roadSelect).toHaveValue(roadId);
  await page.evaluate(() => {
    const key = "yft:multimodal-bus-scenarios:v1";
    const doc = JSON.parse(localStorage.getItem(key)!);
    doc.scenarios[0].roadScenario.ownerId = "00000000-0000-4000-8000-000000000099";
    localStorage.setItem(key, JSON.stringify(doc));
  });
  await page.reload();
  await page.getByRole("button", { name: "Menu Scénarios multimodaux" }).click();
  await page.getByRole("button", { name: "Ouvrir la voirie liée" }).click();
  await expect(page.getByText("Voirie liée indisponible pour le compte connecté.")).toBeVisible();
  await expect(page.getByText("Voirie liée : Voirie de test · référence v-test")).toBeVisible();
});

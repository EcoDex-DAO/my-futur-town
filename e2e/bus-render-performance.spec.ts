import { expect, test } from "@playwright/test";

test.skip(process.env.MFT_BENCHMARK !== "1", "Mesure de performance volontaire");

test("mesure du rendu réseau et rapproché", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Menu Bus" }).click();
  await page.getByRole("button", { name: "Simuler les lignes cochées" }).click();
  const panel = page.getByRole("region", { name: "Simulation des lignes cochées" });
  await panel.getByLabel("Date").fill("2026-11-20");
  await panel.getByLabel("Heure").fill("08:00:00");
  await expect(panel.getByRole("button", { name: "Démarrer" })).toBeEnabled({ timeout: 60000 });
  await panel.getByRole("button", { name: "Démarrer" }).click();
  await expect(panel.locator(".bus-simulation-clock")).not.toContainText("0 bus");
  const measure = () => page.evaluate(async () => {
    const times: number[] = [];
    const counts = new Set<string>();
    const start = performance.now();
    await new Promise<void>((resolve) => {
      function tick(time: number) {
        times.push(time);
        const element = document.querySelector<HTMLElement>(".bus-traffic-markers");
        if (element?.dataset.models) counts.add(`${element.dataset.models} bus / ${element.dataset.modelParts} éléments`);
        if (time - start < 5000) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });
    const gaps = times.slice(1).map((time, index) => time - times[index]).sort((a, b) => a - b);
    return { frames: times.length, p95: gaps[Math.floor(gaps.length * 0.95)], max: gaps.at(-1), models: [...counts] };
  });
  console.log("NETWORK", JSON.stringify(await measure()));
  await panel.getByRole("button", { name: "Pause" }).click();
  await panel.getByRole("button", { name: "Voir un bus de près" }).click();
  await page.waitForTimeout(6000);
  await expect(page.locator(".bus-traffic-markers")).toHaveAttribute("data-models", /[1-9]/);
  console.log("CLOSEUP_PAUSED", JSON.stringify(await measure()));
  await panel.getByRole("button", { name: "Reprendre" }).click();
  console.log("CLOSEUP", JSON.stringify(await measure()));
});

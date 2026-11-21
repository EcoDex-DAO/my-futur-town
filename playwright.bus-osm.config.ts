import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "bus-creator-osm.connected.ts",
  timeout: 240_000,
  workers: 1,
  use: { launchOptions: { args: ["--enable-unsafe-swiftshader"] } },
});

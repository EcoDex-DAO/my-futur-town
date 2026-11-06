import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  testMatch: "roads.connected.ts",
  outputDir: process.env.YFT_TEST_OUTPUT_DIR || "test-results-connected",
  use: {
    ...base.use,
    baseURL: "http://127.0.0.1:4174",
    trace: "off",
    screenshot: "off",
  },
  webServer: {
    timeout: 180_000,
    command: "corepack pnpm run build && corepack pnpm exec next start --hostname 127.0.0.1 --port 4174",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: false,
    env: { NEXT_PUBLIC_API_URL: "" },
  },
});

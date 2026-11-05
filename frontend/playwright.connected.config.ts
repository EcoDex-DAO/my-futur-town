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
    command: "npm run build && npm run preview -- --port 4174 --strictPort",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: false,
    env: { VITE_API_URL: "" },
  },
});

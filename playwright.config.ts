import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  timeout: 180_000,
  workers: 1,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
      args: ["--enable-unsafe-swiftshader"],
    },
    proxy: process.env.HTTPS_PROXY
      ? {
          server: process.env.HTTPS_PROXY,
          bypass: "localhost,127.0.0.1",
        }
      : undefined,
  },
  webServer: {
    timeout: 180_000,
    command: `${process.env.MFT_E2E_SKIP_BUILD === "1" ? "" : "corepack pnpm run build && "}corepack pnpm exec next start --hostname 127.0.0.1 --port 4173`,
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    env: {
      NEXT_PUBLIC_API_URL: "",
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
    },
  },
});

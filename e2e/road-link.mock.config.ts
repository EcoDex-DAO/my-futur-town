import { defineConfig } from "@playwright/test";

// Run in a separate checkout or copy: Next dev writes to the local .next directory.
// Mock Supabase is intercepted in the browser and must never target a real service.
export default defineConfig({
  testDir: ".",
  testMatch: "road-link.spec.ts",
  timeout: 90_000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4174",
    viewport: { width: 1440, height: 1000 },
    launchOptions: { args: ["--enable-unsafe-swiftshader"] },
  },
  webServer: {
    command: "corepack pnpm exec next dev --hostname 127.0.0.1 --port 4174",
    cwd: "..",
    url: "http://127.0.0.1:4174",
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://mock-supabase.invalid",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fake",
    },
  },
});

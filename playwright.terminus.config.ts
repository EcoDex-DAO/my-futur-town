import { defineConfig } from "@playwright/test";
export default defineConfig({ testDir: "./e2e", testMatch: "terminus.spec.ts", timeout: 120000, workers: 1, use: { baseURL: "http://127.0.0.1:4174", launchOptions: { args: ["--enable-unsafe-swiftshader"] } } });

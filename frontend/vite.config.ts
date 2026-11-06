import { defineConfig, loadEnv, type Plugin } from "vite";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import process from "node:process";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "VITE_");
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (key) {
    if (!env.VITE_SUPABASE_URL)
      throw new Error(
        "VITE_SUPABASE_URL is required with the public Supabase key.",
      );
    let publicKey = key.startsWith("sb_publishable_");
    if (!publicKey && key.split(".").length === 3) {
      try {
        publicKey =
          JSON.parse(
            atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
          ).role === "anon";
      } catch {
        publicKey = false;
      }
    }
    if (!publicKey)
      throw new Error(
        "Frontend builds accept only a Supabase publishable or legacy anon key. Never use service_role, a secret key or a management token.",
      );
  }
  const pkg = JSON.parse(
    readFileSync(new URL("./package.json", import.meta.url), "utf8"),
  );
  let revision = process.env.VERCEL_GIT_COMMIT_SHA || "unknown";
  let dirty: boolean | null = null;
  try {
    if (revision === "unknown")
      revision = execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    dirty =
      execFileSync("git", ["status", "--porcelain"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim().length > 0;
  } catch {
    /* A source archive may intentionally have no Git metadata. */
  }
  if (!/^[0-9a-f]{40}$/i.test(revision)) revision = "unknown";
  const buildInfo = {
    version: pkg.version as string,
    revision,
    dirty,
    builtAt: new Date().toISOString(),
    environment: ["production", "preview", "development"].includes(
      process.env.VERCEL_ENV || "",
    )
      ? process.env.VERCEL_ENV
      : "local",
  };
  const metadata: Plugin = {
    name: "yft-build-metadata",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify(buildInfo, null, 2),
      });
    },
    configureServer(server) {
      server.middlewares.use("/version.json", (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify(buildInfo));
      });
    },
  };
  return {
    plugins: [react(), metadata],
    define: { __YFT_BUILD_INFO__: JSON.stringify(buildInfo) },
  };
});

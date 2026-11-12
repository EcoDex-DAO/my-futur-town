import { execFileSync } from "node:child_process";
import type { NextConfig } from "next";
import packageInfo from "./package.json";

const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (key) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL est requis avec la clé Supabase publique.");
  }
  let publicKey = key.startsWith("sb_publishable_");
  if (!publicKey && key.split(".").length === 3) {
    try {
      publicKey = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role === "anon";
    } catch {
      publicKey = false;
    }
  }
  if (!publicKey) {
    throw new Error("Seules les clés Supabase publishable et anon sont autorisées côté client.");
  }
}

let revision = process.env.VERCEL_GIT_COMMIT_SHA || "unknown";
let dirty: boolean | null = null;
try {
  if (revision === "unknown") {
    revision = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  }
  // Hosted builds can modify generated files; their checkout status does not
  // describe the source commit. Report it only for local builds.
  if (!process.env.VERCEL_GIT_COMMIT_SHA) {
    dirty = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().length > 0;
  }
} catch {
  // Git metadata may be unavailable in build environments.
}
if (!/^[0-9a-f]{40}$/i.test(revision)) revision = "unknown";
const buildInfo = {
  version: packageInfo.version,
  revision,
  dirty,
  builtAt: new Date().toISOString(),
  environment: ["production", "preview", "development"].includes(process.env.VERCEL_ENV || "")
    ? process.env.VERCEL_ENV : "local",
};
const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_INFO: JSON.stringify(buildInfo) },
  outputFileTracingIncludes: {
    "/api/bus-route": ["./data/reference/osm/grand-annecy-20261108.*"],
  },
};
export default nextConfig;

import { defineConfig, loadEnv } from "vite";
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
  return { plugins: [react()] };
});

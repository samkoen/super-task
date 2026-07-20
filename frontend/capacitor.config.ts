import type { CapacitorConfig } from "@capacitor/cli";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Charge les clés simples de frontend/.env dans process.env (sans écraser). */
function loadFrontendEnv(): void {
  const envPath = resolve(__dirname, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadFrontendEnv();

const serverUrl = process.env.CAPACITOR_DEV_SERVER_URL?.trim();

let remoteIsHttps = false;
try {
  if (serverUrl) remoteIsHttps = new URL(serverUrl).protocol === "https:";
} catch {
  /* ignore */
}

/**
 * Ne pas fixer `hostname` sur le domaine Vercel en même temps que `url` :
 * ça casse parfois cookies / origine dans le WebView.
 * CapacitorCookies désactivé : le bridge synchrone fige souvent l’UI Android.
 */
const config: CapacitorConfig = {
  appId: "com.supershift.app",
  appName: "SuperShift",
  webDir: "dist",
  android: {
    allowMixedContent: true,
  },
  server: {
    androidScheme: "https",
    cleartext: true,
    ...(serverUrl ? { url: serverUrl } : {}),
  },
  plugins: {
    CapacitorCookies: {
      enabled: false,
    },
    CapacitorHttp: {
      enabled: !remoteIsHttps,
    },
  },
};

export default config;

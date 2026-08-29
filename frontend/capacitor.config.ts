import type { CapacitorConfig } from "@capacitor/cli";

/**
 * APK bundlé (webDir=dist) — ne PAS utiliser server.url vers Vercel :
 * charger le site distant dans le WebView provoque des freezes totaux (ANR).
 * L’API pointe via VITE_API_URL au build (https://super-nihul.vercel.app/api).
 */
const config: CapacitorConfig = {
  appId: "com.supershift.app",
  appName: "super-man",
  webDir: "dist",
  android: {
    allowMixedContent: true,
  },
  server: {
    androidScheme: "https",
    hostname: "localhost",
    cleartext: true,
  },
  plugins: {
    // Requis pour cookies de session vers l’API Vercel (origine https://localhost).
    CapacitorCookies: {
      enabled: true,
    },
    CapacitorHttp: {
      enabled: true,
    },
    LocalNotifications: {
      smallIcon: "ic_launcher",
      iconColor: "#1A9B86",
      sound: "default",
    },
  },
};

export default config;

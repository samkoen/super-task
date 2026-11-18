import { chromium } from "@playwright/test";
import { WEB_PORT } from "./fixtures/world";
import { he } from "./fixtures/login";

/**
 * Préchauffe le serveur Vite : au premier lancement il compile l'app à froid
 * (pré-bundle des dépendances, parfois un rechargement complet), ce qui dépasse
 * le timeout de 30 s du premier test. On attend ici que /login soit vraiment affichée.
 */
export default async function globalSetup() {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${WEB_PORT}/login`, { timeout: 180_000 });
    await page
      .getByRole("textbox", { name: he.loginIdentifier, exact: true })
      .waitFor({ state: "visible", timeout: 180_000 });
  } finally {
    await browser.close();
  }
}

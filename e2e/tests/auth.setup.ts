import { test as setup, expect } from "@playwright/test";
import { AUTH_FILE, EMPLOYEE_EMAIL, MANAGER_EMAIL, PASSWORD } from "../fixtures/world";
import { loginViaUi } from "../fixtures/login";

// Une connexion par rôle ; les autres tests réutilisent la session sauvegardée.
setup("connexion menahel", async ({ page }) => {
  await loginViaUi(page, MANAGER_EMAIL, PASSWORD);
  await expect(page).toHaveURL(/\/manager/);
  await page.context().storageState({ path: AUTH_FILE.manager });
});

setup("connexion oved", async ({ page }) => {
  await loginViaUi(page, EMPLOYEE_EMAIL, PASSWORD);
  await expect(page).toHaveURL(/\/employee/);
  await page.context().storageState({ path: AUTH_FILE.employee });
});

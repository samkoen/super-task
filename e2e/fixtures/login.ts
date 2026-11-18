import type { Page } from "@playwright/test";

/** Libellés de frontend/src/i18n/he.ts */
export const he = {
  loginIdentifier: "מזהה",
  password: "סיסמה",
  login: "התחברות",
};

export async function loginViaUi(page: Page, email: string, password: string) {
  await page.goto("/login");
  // Le <label> MUI contient « * » (champ requis) : on cible le nom accessible du champ.
  await page.getByRole("textbox", { name: he.loginIdentifier, exact: true }).fill(email);
  await page.getByRole("textbox", { name: he.password, exact: true }).fill(password);
  await page.getByRole("button", { name: he.login }).click();
}

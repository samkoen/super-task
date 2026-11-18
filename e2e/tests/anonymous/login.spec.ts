import { test, expect } from "@playwright/test";
import { EMPLOYEE_EMAIL, PASSWORD } from "../../fixtures/world";
import { loginViaUi } from "../../fixtures/login";

test("une page protégée renvoie vers /login", async ({ page }) => {
  await page.goto("/employee");
  await expect(page).toHaveURL(/\/login/);
});

test("mauvais mot de passe : message d'erreur, on reste sur /login", async ({ page }) => {
  await loginViaUi(page, EMPLOYEE_EMAIL, "pas-le-bon");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("l'oved se connecte et arrive sur /employee", async ({ page }) => {
  await loginViaUi(page, EMPLOYEE_EMAIL, PASSWORD);
  await expect(page).toHaveURL(/\/employee/);
});

import { test, expect } from "@playwright/test";
import { SEEDED_TASK_TITLE } from "../../fixtures/world";

test("l'oved voit la tâche qui lui est assignée", async ({ page }) => {
  await page.goto("/employee");
  await expect(page.getByText(SEEDED_TASK_TITLE).first()).toBeVisible();
});

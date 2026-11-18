import { test, expect } from "@playwright/test";
import { SEEDED_TASK_TITLE } from "../../fixtures/world";

test("le menahel voit la tâche du jour dans la liste", async ({ page }) => {
  await page.goto("/manager/tasks");
  await expect(page.getByText(SEEDED_TASK_TITLE).first()).toBeVisible();
});

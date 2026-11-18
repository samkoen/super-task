import { test, expect } from "@playwright/test";
import { AUTH_FILE } from "../../fixtures/world";

/**
 * Parcours complet sur deux sessions en parallèle :
 * le menahel crée une tâche pour l'oved → l'oved la fait → le menahel la voit « ממתין לאישור ».
 */
test("menahel crée une tâche, l'oved la termine, le menahel la reçoit", async ({ browser }) => {
  const title = `משימה e2e ${Date.now()}`;

  const managerCtx = await browser.newContext({ storageState: AUTH_FILE.manager });
  const employeeCtx = await browser.newContext({ storageState: AUTH_FILE.employee });
  const manager = await managerCtx.newPage();
  const employee = await employeeCtx.newPage();

  await test.step("le menahel crée la tâche", async () => {
    await manager.goto("/manager/tasks/new");
    await manager.getByRole("textbox", { name: "כותרת" }).fill(title);
    await manager.getByRole("radio", { name: "עובד בדיקה" }).click();
    await manager.getByRole("button", { name: "יצירת המשימה" }).click();
    await expect(manager).toHaveURL(/\/manager\/tasks$/);
    await expect(manager.getByRole("alert")).toContainText("משימה מזדמנת נוצרה");
    await expect(manager.getByRole("button", { name: title })).toContainText("ממתין");
  });

  await test.step("l'oved la voit et la termine", async () => {
    await employee.goto("/employee");
    await employee.getByRole("button", { name: title }).click();
    const sheet = employee.getByRole("dialog");
    await expect(sheet.getByRole("heading", { name: title })).toBeVisible();
    await sheet.getByRole("button", { name: "ביצוע משימה" }).click();
    await expect(employee.getByRole("alert")).toContainText("המשימה נשלחה לאישור המנהל");
    await expect(employee.getByRole("button", { name: `${title} · בוצעה` })).toBeVisible();
  });

  await test.step("le menahel la voit en attente de validation", async () => {
    await manager.reload();
    await expect(manager.getByRole("button", { name: title })).toContainText("ממתין לאישור");
  });

  await managerCtx.close();
  await employeeCtx.close();
});

import { test, expect, type Page } from "@playwright/test";
import { AUTH_FILE } from "../../fixtures/world";

/** Libellés de frontend/src/i18n/he.ts */
const he = {
  record: "הקלט",
  stop: "עצור",
  enableCamera: "הפעל מצלמה",
  reviewConfirm: "אישור",
  cardMenu: "אפשרויות",
  skipButton: "לא ניתן לצלם",
  skipConfirm: "דיווח והמשך",
  tabReady: "מוכן לשליחה",
  tabSkipped: "לא צולם",
};

// Fausse caméra Chromium : getUserMedia et MediaRecorder marchent sans vrai appareil.
test.use({
  launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
});

/** Filme la carte active : ouvre la caméra, enregistre un peu plus que le minimum, confirme la revue. */
async function filmActiveCard(employee: Page) {
  await employee.getByTestId("flow-primary").click();
  const enable = employee.getByRole("button", { name: he.enableCamera });
  if (await enable.isVisible().catch(() => false)) await enable.click();
  await employee.getByRole("button", { name: he.record, exact: true }).click();
  await employee.waitForTimeout(2_500);
  await employee.getByRole("button", { name: he.stop, exact: true }).click();
  await employee.getByTestId("flow-review-confirm").click();
}

/**
 * Régression : une tâche à 2 sous-tâches vidéo, la 1re filmée, la 2e « לא ניתן לצלם ».
 * L'oved revient aux tâches du jour puis rouvre la tâche : la prise et la raison sont toujours là.
 */
test("l'oved retrouve la prise et « לא ניתן לצלם » en rouvrant la tâche", async ({ browser }) => {
  test.setTimeout(90_000);
  const title = `משימה צילום e2e ${Date.now()}`;

  const managerCtx = await browser.newContext({ storageState: AUTH_FILE.manager });
  const employeeCtx = await browser.newContext({
    storageState: AUTH_FILE.employee,
    permissions: ["camera", "microphone"],
  });
  const employee = await employeeCtx.newPage();

  await test.step("le menahel crée une tâche avec 2 sous-tâches vidéo", async () => {
    const me = await employeeCtx.request.get("/api/auth/me");
    expect(me.ok()).toBeTruthy();
    const { id: employeeId, branch_id: branchId } = (await me.json()).user as { id: string; branch_id: string };
    const created = await managerCtx.request.post("/api/tasks/ad-hoc", {
      data: {
        title,
        branch_id: branchId,
        // Échéance toute proche : la tâche reste dans « המשימות להיום », même lancée tard le soir.
        due_at: new Date(Date.now() + 60 * 1000).toISOString(),
        assignee_user_id: employeeId,
        completion_requirements: [
          { kind: "video", title: "מדף", min_seconds: 1 },
          { kind: "video", title: "קופה", min_seconds: 1 },
        ],
      },
    });
    expect(created.ok(), await created.text()).toBeTruthy();
  });

  await test.step("l'oved filme la 1re sous-tâche et déclare « לא ניתן לצלם » sur la 2e", async () => {
    await employee.goto("/employee");
    await employee.getByRole("button", { name: title }).first().click();
    await expect(employee.getByTestId("task-flow")).toBeVisible();

    await filmActiveCard(employee);
    await expect(employee.getByTestId("flow-card")).toHaveAttribute("data-index", "1");

    await employee.getByRole("button", { name: he.cardMenu }).click();
    await employee.getByTestId("flow-skip").click();
    await employee.getByTestId("flow-skip-reason-no_stock").click();
    await employee.getByTestId("flow-skip-confirm").click();
  });

  await test.step("l'oved revient aux tâches du jour", async () => {
    // Tout est remis : le récap s'ouvre ; on le ferme puis on quitte la tâche.
    await employee.getByTestId("flow-summary-back").click();
    await employee.getByTestId("task-flow-back").click();
    await expect(employee.getByTestId("task-flow")).toBeHidden();
  });

  await test.step("en rouvrant la tâche, la prise et « לא ניתן לצלם » sont là", async () => {
    await employee.getByRole("button", { name: title }).first().click();
    await expect(employee.getByTestId("task-flow")).toBeVisible();

    // 1re sous-tâche : ouverte, avec sa vidéo.
    const card = employee.getByTestId("flow-card");
    await expect(card).toHaveAttribute("data-index", "0");
    await expect(card.getByTestId("flow-captured")).toBeVisible();

    // 2e sous-tâche : repliée, marquée « לא צולם ».
    const skipped = employee.getByTestId("flow-tab-done").filter({ hasText: he.tabSkipped });
    await expect(skipped).toHaveAttribute("data-index", "1");
  });

  await managerCtx.close();
  await employeeCtx.close();
});

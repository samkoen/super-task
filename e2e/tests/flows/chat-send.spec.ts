import { test, expect, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { AUTH_FILE } from "../../fixtures/world";

/** Libellés de frontend/src/i18n/he.ts */
const he = {
  newChat: "צ׳אט חדש",
  generalPlaceholder: "הודעה...",
  taskPlaceholder: "כתבו הודעה או שאלה…",
  send: "שליחה",
  sent: "ההודעה נשלחה",
  recordAudio: "הקלטה",
  audioSend: "שליחת הקלטה",
  camera: "מצלמה",
  enableCamera: "הפעל מצלמה",
  captureVideo: "וידאו",
  captureStop: "עצור",
  useRecording: "אשר והוסף",
  cardMenu: "אפשרויות",
  menuChat: "צ׳אט",
};

// Fausse caméra / micro Chromium : getUserMedia et MediaRecorder marchent sans vrai appareil.
test.use({
  launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
});

type World = { managerCtx: BrowserContext; employeeCtx: BrowserContext; employee: Page };

async function openWorld(browser: Browser): Promise<World> {
  const managerCtx = await browser.newContext({ storageState: AUTH_FILE.manager });
  const employeeCtx = await browser.newContext({
    storageState: AUTH_FILE.employee,
    permissions: ["camera", "microphone"],
  });
  return { managerCtx, employeeCtx, employee: await employeeCtx.newPage() };
}

/** Le menahel crée une tâche du jour pour l'oved ; `requirements` = sous-tâches. Renvoie son id. */
async function createTask(world: World, title: string, requirements: unknown[] = []): Promise<string> {
  const me = await world.employeeCtx.request.get("/api/auth/me");
  expect(me.ok()).toBeTruthy();
  const { id, branch_id } = (await me.json()).user as { id: string; branch_id: string };
  const created = await world.managerCtx.request.post("/api/tasks/ad-hoc", {
    data: {
      title,
      branch_id,
      // Échéance toute proche : la tâche reste dans « המשימות להיום », même lancée tard le soir.
      due_at: new Date(Date.now() + 60 * 1000).toISOString(),
      assignee_user_id: id,
      completion_requirements: requirements,
      photo_required: requirements.length > 0,
    },
  });
  expect(created.ok(), await created.text()).toBeTruthy();
  return ((await created.json()) as { occurrence: { id: string } }).occurrence.id;
}

async function occurrenceStatus(ctx: BrowserContext, id: string): Promise<string> {
  const res = await ctx.request.get(`/api/tasks/occurrences/${id}`);
  expect(res.ok(), await res.text()).toBeTruthy();
  const data = (await res.json()) as { status?: string; occurrence?: { status: string } };
  return data.occurrence?.status ?? data.status ?? "";
}

/** L'oved commence puis envoie la tâche : elle passe « ממתין לאישור ». */
async function submitTask(world: World, id: string) {
  const started = await world.employeeCtx.request.post(`/api/tasks/occurrences/${id}/start`);
  expect(started.ok(), await started.text()).toBeTruthy();
  const done = await world.employeeCtx.request.post(`/api/tasks/occurrences/${id}/complete`, {
    data: { status: "completed" },
  });
  expect(done.ok(), await done.text()).toBeTruthy();
  expect(await occurrenceStatus(world.managerCtx, id)).toBe("pending_review");
}

/**
 * Deux messages de suite : le second prouve que la zone de saisie reste utilisable après un envoi
 * (régression : le toast « ההודעה נשלחה » la recouvrait et ne se fermait plus au toucher).
 */
async function sendTwoTexts(page: Page, input: Locator, sendButton: Locator, label: string) {
  for (const n of [1, 2]) {
    const text = `${label} ${n} ${Date.now()}`;
    await input.fill(text);
    await sendButton.click();
    await expect(page.getByText(text)).toBeVisible();
    await expect(page.getByText(he.sent)).toHaveCount(0);
  }
}

/** Vidéo par la caméra du chat (ChatPhotoCapture), ouverte par `openCamera`. */
async function sendVideo(page: Page, openCamera: Locator) {
  const before = await page.locator("video").count();
  await openCamera.click();
  const enable = page.getByRole("button", { name: he.enableCamera });
  if (await enable.isVisible().catch(() => false)) await enable.click();
  await page.getByRole("button", { name: he.captureVideo, exact: true }).click();
  await page.waitForTimeout(2_000);
  await page.getByRole("button", { name: he.captureStop, exact: true }).click();
  await page.getByRole("button", { name: he.useRecording }).click();
  await expect.poll(() => page.locator("video").count(), { timeout: 15_000 }).toBeGreaterThan(before);
}

/** Vocal par le composer standard (général / tâche) : « הקלטה » puis « שליחת הקלטה ». */
async function sendAudio(page: Page) {
  const before = await page.locator("audio").count();
  await page.getByRole("button", { name: he.recordAudio, exact: true }).click();
  await page.waitForTimeout(1_500);
  await page.getByRole("button", { name: he.audioSend }).click();
  await expect.poll(() => page.locator("audio").count(), { timeout: 15_000 }).toBeGreaterThan(before);
}

/** Vocal par le composer FLOW 1 (sous-tâche) : micro, arrêt, envoi. */
async function sendFlowAudio(page: Page) {
  await page.getByTestId("flow-chat-mic").click();
  await page.waitForTimeout(1_500);
  await page.getByTestId("flow-chat-voice-stop").click();
  await page.getByTestId("flow-chat-send").click();
  await expect(page.getByTestId("flow-chat-voice-clock")).toHaveCount(0);
  await expect(page.getByTestId("flow-chat-mic")).toBeEnabled();
}

async function openTaskFlow(page: Page, title: string) {
  await page.goto("/employee");
  await page.getByRole("button", { name: title }).first().click();
  await expect(page.getByTestId("task-flow")).toBeVisible();
}

test.describe("l'oved écrit et envoie des médias dans le chat", () => {
  test.setTimeout(90_000);

  test("chat général avec la menahelet : texte, vocal, vidéo", async ({ browser }) => {
    const { employee } = await openWorld(browser);
    await employee.goto("/employee/chats");
    await employee.getByRole("button", { name: he.newChat }).click();
    await employee.getByTestId("new-chat-general").click();

    const input = employee.getByPlaceholder(he.generalPlaceholder);
    await sendTwoTexts(employee, input, employee.getByRole("button", { name: he.send, exact: true }), "שלום מנהלת");
    await sendAudio(employee);
    await sendVideo(employee, employee.getByRole("button", { name: he.camera, exact: true }));
  });

  test("chat de tâche (depuis « צ׳אט חדש ») : texte, vocal, vidéo", async ({ browser }) => {
    const world = await openWorld(browser);
    const { employee } = world;
    const title = `משימת צ׳אט e2e ${Date.now()}`;
    await createTask(world, title);

    await employee.goto("/employee/chats");
    await employee.getByRole("button", { name: he.newChat }).click();
    await employee.getByRole("button", { name: new RegExp(title) }).click();

    const input = employee.getByPlaceholder(he.taskPlaceholder);
    await sendTwoTexts(employee, input, employee.getByRole("button", { name: he.send, exact: true }), "שאלה על המשימה");
    await sendAudio(employee);
    await sendVideo(employee, employee.getByRole("button", { name: he.camera, exact: true }));
  });

  // Vidéo client du 20/11 : « פתיחת משמרת » envoyée, en attente d'approbation → chat sans zone de saisie.
  test("chat de tâche en attente d'approbation : texte et vocal, la tâche reste à approuver", async ({ browser }) => {
    const world = await openWorld(browser);
    const { employee } = world;
    const title = `משימה לאישור e2e ${Date.now()}`;
    const id = await createTask(world, title);
    await submitTask(world, id);

    await employee.goto("/employee/chats");
    await employee.getByRole("button", { name: he.newChat }).click();
    await employee.getByRole("button", { name: new RegExp(title) }).click();

    const input = employee.getByPlaceholder(he.taskPlaceholder);
    await sendTwoTexts(employee, input, employee.getByRole("button", { name: he.send, exact: true }), "שאלה לפני אישור");
    await sendAudio(employee);
    expect(await occurrenceStatus(world.managerCtx, id)).toBe("pending_review");
  });

  test("chat de tâche rouvert depuis la liste des chats : texte", async ({ browser }) => {
    const world = await openWorld(browser);
    const { employee } = world;
    const title = `משימת רשימה e2e ${Date.now()}`;
    await createTask(world, title);

    await employee.goto("/employee/chats");
    await employee.getByRole("button", { name: he.newChat }).click();
    await employee.getByRole("button", { name: new RegExp(title) }).click();
    const input = employee.getByPlaceholder(he.taskPlaceholder);
    await sendTwoTexts(employee, input, employee.getByRole("button", { name: he.send, exact: true }), "פתיחה");
    await employee.goBack().catch(() => undefined);

    await employee.goto("/employee/chats");
    await employee.getByRole("button", { name: new RegExp(title) }).first().click();
    await sendTwoTexts(employee, input, employee.getByRole("button", { name: he.send, exact: true }), "המשך");
  });

  test("chat de sous-tâche (menu de la carte) : texte, vocal, vidéo", async ({ browser }) => {
    const world = await openWorld(browser);
    const { employee } = world;
    const title = `משימת תת-משימה e2e ${Date.now()}`;
    await createTask(world, title, [{ kind: "video", title: "מדף", min_seconds: 1 }]);

    await openTaskFlow(employee, title);
    await employee.getByRole("button", { name: he.cardMenu }).click();
    await employee.getByTestId("flow-card-menu-chat").click();
    await expect(employee.getByTestId("flow-task-chat")).toBeVisible();

    await sendTwoTexts(employee, employee.getByTestId("flow-chat-input"), employee.getByTestId("flow-chat-send"), "שאלה על המדף");
    await sendFlowAudio(employee);
    await sendVideo(employee, employee.getByTestId("flow-chat-camera"));
  });

  test("chat de sous-tâche (depuis la caméra) : texte et vocal", async ({ browser }) => {
    const world = await openWorld(browser);
    const { employee } = world;
    const title = `משימת מצלמה e2e ${Date.now()}`;
    await createTask(world, title, [{ kind: "video", title: "מדף", min_seconds: 1 }]);

    await openTaskFlow(employee, title);
    await employee.getByTestId("flow-primary").click();
    const enable = employee.getByRole("button", { name: he.enableCamera });
    if (await enable.isVisible().catch(() => false)) await enable.click();
    await employee.getByRole("button", { name: he.menuChat, exact: true }).click();
    await expect(employee.getByTestId("flow-task-chat")).toBeVisible();

    await sendTwoTexts(employee, employee.getByTestId("flow-chat-input"), employee.getByTestId("flow-chat-send"), "שאלה מהמצלמה");
    await sendFlowAudio(employee);
  });
});

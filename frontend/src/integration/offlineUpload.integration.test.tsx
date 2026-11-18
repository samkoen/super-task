/**
 * Intégration côté téléphone : l'oved finit une tâche sans קליטה, puis le réseau revient.
 *
 * Code réel : file des envois (useSlotUploads + file partagée), signal « tâche finie », renvoi automatique,
 * bandeau, liste « המשימות להיום ». Seul le serveur est simulé (FakeServer) : il garde l'état de la tâche
 * et refuse toute requête quand le réseau est coupé — comme le vrai téléphone.
 */
import { act, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { server, feedback } = vi.hoisted(() => {
  type Net = "offline" | "weak" | "online";
  const networkError = () => Object.assign(new Error("Network Error"), { code: "ERR_NETWORK", isAxiosError: true });
  const server = {
    net: "offline" as Net,
    task: { id: "occ-1", status: "pending", awaiting_upload_at: null as string | null },
    calls: [] as string[],
    /** Réseau faible : seul le petit signal (quelques octets) passe, pas les fichiers. */
    reach(call: string) {
      if (server.net === "offline" || (server.net === "weak" && call !== "finishedOffline")) throw networkError();
      server.calls.push(call);
    },
  };
  return { server, feedback: { showSuccess: vi.fn(), showError: vi.fn() } };
});

vi.mock("../services/taskService", () => ({
  taskService: {
    uploadPhoto: async () => {
      server.reach("uploadPhoto");
      return { url: "/uploads/store.jpg" };
    },
    uploadVideo: async () => {
      server.reach("uploadVideo");
      return { url: "/uploads/v.webm" };
    },
    uploadAudio: async () => {
      server.reach("uploadAudio");
      return { url: "/uploads/a.webm" };
    },
    start: async () => {
      server.reach("start");
      server.task.status = "in_progress";
      return { occurrence: { ...server.task } };
    },
    finishedOffline: async (_id: string, finishedAt: string) => {
      server.reach("finishedOffline");
      if (server.task.status === "pending") server.task.status = "in_progress";
      server.task.awaiting_upload_at = finishedAt;
      return { occurrence: { ...server.task } };
    },
    submitSlot: async () => {
      server.reach("submitSlot");
      // Tâche à une seule sous-tâche : la preuve complète part chez le menahel, l'attente est effacée.
      server.task.status = "pending_review";
      server.task.awaiting_upload_at = null;
      return { occurrence: { ...server.task }, slot_index: 0, task_submitted: true, pending_slots: [] };
    },
  },
}));
vi.mock("../context/FeedbackContext", () => ({ useFeedback: () => feedback }));
vi.mock("../components/notifications/NotificationBell", () => ({
  default: ({ renderTrigger }: { renderTrigger: (open: () => void, unread: number) => JSX.Element }) => renderTrigger(() => undefined, 0),
}));
vi.mock("../hooks/useResolvedMediaSrc", () => ({ useResolvedMediaSrc: () => ({ src: null }) }));

import EmployeeUploadBanner from "../components/employee/EmployeeUploadBanner";
import TodayTasksScreen from "../components/todaytasks/TodayTasksScreen";
import { usePendingUploads } from "../hooks/usePendingUploads";
import { useSlotAutoFlush } from "../hooks/useSlotAutoFlush";
import { useSlotUploads } from "../hooks/useSlotUploads";
import { he } from "../i18n/he";
import { readFinishMarkers } from "../utils/finishSignals";
import { getSlotUploadQueue } from "../utils/slotSender";

type Uploads = ReturnType<typeof useSlotUploads>;

/** Le téléphone de l'oved : écran de la tâche (envoi), liste du jour, bandeau, renvoi automatique. */
function OvedPhone({ handle, onSavedOnDevice }: { handle: { current: Uploads | null }; onSavedOnDevice: () => void }) {
  useSlotAutoFlush(true);
  const uploads = useSlotUploads({
    occurrenceId: server.task.id,
    requirements: [{ kind: "photo", title: "המחסן" }],
    completion: null,
    locate: async () => null,
    onSavedOnDevice,
  });
  handle.current = uploads;
  const pending = usePendingUploads();
  return (
    <>
      <TodayTasksScreen
        tasks={[{ id: server.task.id, title: "סידור מחסן", due_at: new Date(2026, 10, 18, 15).toISOString(), status: server.task.status }]}
        awaitingUploadIds={pending.taskIds}
        employeeName="שמואל"
        onOpenTask={() => undefined}
        onOpenTaskChat={() => undefined}
        onOpenChats={() => undefined}
        onOpenAccount={() => undefined}
      />
      <EmployeeUploadBanner />
    </>
  );
}

function setNetwork(net: typeof server.net) {
  server.net = net;
  window.dispatchEvent(new Event(net === "offline" ? "offline" : "online"));
}

const taskRow = () => screen.getByTestId("today-task-item");
const banner = () => screen.queryByTestId("employee-upload-banner");

describe("oved sans קליטה, puis le réseau revient", () => {
  beforeEach(async () => {
    localStorage.clear();
    Object.defineProperty(window.navigator, "onLine", { configurable: true, get: () => server.net !== "offline" });
    server.net = "offline";
    server.task = { id: "occ-1", status: "pending", awaiting_upload_at: null };
    server.calls = [];
    feedback.showSuccess.mockReset();
    URL.createObjectURL = vi.fn(() => "blob:preview");
    const queue = getSlotUploadQueue();
    for (const entry of await queue.list()) await queue.remove(entry.id);
  });

  afterEach(() => {
    delete (window.navigator as { onLine?: boolean }).onLine;
  });

  it("finit la tâche hors ligne, prévient le menahel dès qu'un peu de réseau revient, puis envoie la photo", async () => {
    const handle: { current: Uploads | null } = { current: null };
    const onSavedOnDevice = vi.fn();
    render(<OvedPhone handle={handle} onSavedOnDevice={onSavedOnDevice} />);

    // 1. Sans קליטה : l'oved photographie et appuie sur « שליחה ».
    act(() => handle.current!.film(0, new File(["jpg"], "store.jpg", { type: "image/jpeg" })));
    act(() => handle.current!.keep(0));
    await act(async () => {
      await handle.current!.sendAll();
    });

    expect(onSavedOnDevice).toHaveBeenCalledWith(0);
    expect(server.calls).toEqual([]);
    expect(server.task.status).toBe("pending");
    expect(readFinishMarkers().map((marker) => marker.occurrenceId)).toEqual(["occ-1"]);
    await waitFor(() => expect(banner()?.textContent).toContain(he.uploadBannerOffline(1)));
    expect(banner()?.getAttribute("data-online")).toBe("false");
    expect(taskRow().getAttribute("data-state")).toBe("awaiting-upload");
    expect(within(taskRow()).getByTestId("today-task-checkbox").getAttribute("data-done")).toBe("true");
    expect(within(taskRow()).getByText(he.todayAwaitingUpload)).toBeTruthy();

    // 2. קליטה faible : le petit signal passe (le menahel voit « ממתין להעלאה »), la photo attend encore.
    await act(async () => setNetwork("weak"));
    await waitFor(() => expect(server.task.awaiting_upload_at).not.toBeNull());
    expect(server.task.status).toBe("in_progress");
    expect(server.calls).toEqual(["finishedOffline"]);
    expect(readFinishMarkers()).toEqual([]);
    expect((await getSlotUploadQueue().list()).map((entry) => entry.status)).toEqual(["pending"]);
    await waitFor(() => expect(banner()?.textContent).toContain(he.uploadBannerSending(1)));

    // 3. La קליטה revient : la photo part toute seule, la preuve arrive chez le menahel.
    await act(async () => setNetwork("online"));
    await waitFor(() => expect(server.task.status).toBe("pending_review"));
    expect(server.task.awaiting_upload_at).toBeNull();
    expect(server.calls).toEqual(["finishedOffline", "uploadPhoto", "submitSlot"]);
    expect(await getSlotUploadQueue().list()).toEqual([]);
    await waitFor(() => expect(banner()).toBeNull());
    expect(feedback.showSuccess).toHaveBeenCalledWith(he.uploadAllSent);
  });

  it("quand tout le réseau revient d'un coup, le signal part avant la photo", async () => {
    const handle: { current: Uploads | null } = { current: null };
    render(<OvedPhone handle={handle} onSavedOnDevice={() => undefined} />);
    act(() => handle.current!.film(0, new File(["jpg"], "store.jpg", { type: "image/jpeg" })));
    act(() => handle.current!.keep(0));
    await act(async () => {
      await handle.current!.sendAll();
    });

    await act(async () => setNetwork("online"));
    await waitFor(() => expect(server.task.status).toBe("pending_review"));
    expect(server.calls).toEqual(["finishedOffline", "uploadPhoto", "submitSlot"]);
    expect(readFinishMarkers()).toEqual([]);
  });

  it("si la photo part avant toute coupure, aucun signal « fini hors ligne » n'est envoyé", async () => {
    server.net = "online";
    const handle: { current: Uploads | null } = { current: null };
    render(<OvedPhone handle={handle} onSavedOnDevice={() => undefined} />);
    act(() => handle.current!.film(0, new File(["jpg"], "store.jpg", { type: "image/jpeg" })));
    act(() => handle.current!.keep(0));
    await act(async () => {
      await handle.current!.sendAll();
    });

    await waitFor(() => expect(server.task.status).toBe("pending_review"));
    expect(server.calls).toEqual(["uploadPhoto", "submitSlot"]);
    expect(readFinishMarkers()).toEqual([]);
    expect(banner()).toBeNull();
  });
});

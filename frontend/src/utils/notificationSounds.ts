/** Sons distincts pour l'employé (Web Audio — pas de fichiers). */

export type NotificationSoundKind = "new_task" | "task_end" | "alert" | "none";

type AudioContextCtor = typeof AudioContext;

let sharedCtx: AudioContext | null = null;
let unlockBound = false;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  return window.AudioContext || (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext || null;
}

function getSharedContext(): AudioContext | null {
  const Ctor = getAudioContextCtor();
  if (!Ctor) return null;
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new Ctor();
  }
  return sharedCtx;
}

/** À appeler après un clic/touche utilisateur — débloque l'audio Chrome/Edge/Windows. */
export async function unlockNotificationAudio(): Promise<void> {
  const ctx = getSharedContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      /* ignore */
    }
  }
}

/** Bind once : premier geste souris/clavier débloque le son pour les SSE suivants. */
export function bindNotificationAudioUnlock(): () => void {
  if (typeof window === "undefined" || unlockBound) {
    return () => undefined;
  }
  unlockBound = true;
  const unlock = () => {
    void unlockNotificationAudio();
  };
  window.addEventListener("pointerdown", unlock, { once: true, capture: true });
  window.addEventListener("keydown", unlock, { once: true, capture: true });
  return () => {
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("keydown", unlock, true);
  };
}

async function playToneSequence(
  steps: Array<{ freq: number; start: number; duration: number; gain?: number }>,
): Promise<void> {
  const ctx = getSharedContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return;
    }
  }
  if (ctx.state !== "running") return;

  const master = ctx.createGain();
  master.gain.value = 0.35;
  master.connect(ctx.destination);
  const t0 = ctx.currentTime;
  for (const step of steps) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = step.freq;
    const g = step.gain ?? 1;
    gain.gain.setValueAtTime(0.0001, t0 + step.start);
    gain.gain.linearRampToValueAtTime(0.9 * g, t0 + step.start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + step.start + step.duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0 + step.start);
    osc.stop(t0 + step.start + step.duration + 0.02);
  }
}

/** משימה חדשה — montée claire (deux notes ascendantes). */
export function playNewTaskSound(): void {
  void playToneSequence([
    { freq: 523.25, start: 0, duration: 0.18 },
    { freq: 659.25, start: 0.16, duration: 0.28 },
  ]);
}

/** סיום משימה — descente (deux notes descendantes), distincte de la nouvelle. */
export function playTaskEndSound(): void {
  void playToneSequence([
    { freq: 784.0, start: 0, duration: 0.16 },
    { freq: 493.88, start: 0.18, duration: 0.32 },
  ]);
}

/** Alerte inactivité — triple bip court. */
export function playAlertSound(): void {
  void playToneSequence([
    { freq: 880, start: 0, duration: 0.1, gain: 0.85 },
    { freq: 880, start: 0.16, duration: 0.1, gain: 0.85 },
    { freq: 880, start: 0.32, duration: 0.14, gain: 0.95 },
  ]);
}

export function playNotificationSound(kind: NotificationSoundKind | string | undefined): void {
  if (!kind || kind === "none") return;
  if (kind === "new_task") {
    playNewTaskSound();
    return;
  }
  if (kind === "task_end") {
    playTaskEndSound();
    return;
  }
  if (kind === "alert") {
    playAlertSound();
  }
}

export function soundKindFromNotificationKind(kind: string | undefined): NotificationSoundKind {
  if (!kind) return "none";
  if (kind === "task_created" || kind === "task_delegated") return "new_task";
  if (kind === "task_cancelled" || kind === "task_reopened") return "task_end";
  if (kind.startsWith("employee_idle")) return "alert";
  return "none";
}

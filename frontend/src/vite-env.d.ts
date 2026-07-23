/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Poll de secours du chat tâche (ms). Défaut 10000. */
  readonly VITE_TASK_CHAT_POLL_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

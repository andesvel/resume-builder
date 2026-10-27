import { create } from "zustand";

import type { Availability, LlmEngine, LoadProgress } from "./engine";
import { defaultWebLlmModel, type WebLlmModelId } from "./models";

export type EnginePreference = "auto" | "chrome" | "webllm";

type Status =
  | { kind: "idle" }
  | { kind: "loading"; progress: LoadProgress }
  | { kind: "ready"; engine: LlmEngine }
  | { kind: "error"; error: unknown };

interface AiState {
  availability: { chrome: Availability; webllm: Availability } | null;
  preference: EnginePreference;
  webLlmModel: WebLlmModelId;
  status: Status;
  detect: () => Promise<void>;
  /** Which backend `load` would use, given availability and preference. */
  resolve: () => { engine: "chrome" | "webllm"; needsDownload: boolean } | null;
  load: () => Promise<LlmEngine>;
  setPreference: (preference: EnginePreference) => void;
}

const PREF_KEY = "ai-preference";

function readPreference(): EnginePreference {
  try {
    const v = localStorage.getItem(PREF_KEY);
    return v === "chrome" || v === "webllm" ? v : "auto";
  } catch {
    return "auto";
  }
}

let loading: Promise<LlmEngine> | null = null;

export const useAi = create<AiState>()((set, get) => ({
  availability: null,
  preference: "auto",
  webLlmModel: defaultWebLlmModel,
  status: { kind: "idle" },

  detect: async () => {
    const [{ chromeAvailability }, { webLlmAvailability }] = await Promise.all([
      import("./chrome-engine.client"),
      import("./webllm-engine.client"),
    ]);
    const [chrome, webllm] = await Promise.all([chromeAvailability(), webLlmAvailability()]);
    set({ availability: { chrome, webllm }, preference: readPreference() });
  },

  resolve: () => {
    const { availability, preference } = get();
    if (!availability) return null;
    const usable = (a: Availability) => a !== "unsupported";
    const pick =
      preference !== "auto" && usable(availability[preference])
        ? preference
        : usable(availability.chrome)
          ? "chrome"
          : usable(availability.webllm)
            ? "webllm"
            : null;
    return pick ? { engine: pick, needsDownload: availability[pick] === "download" } : null;
  },

  load: () => {
    const { status } = get();
    if (status.kind === "ready") return Promise.resolve(status.engine);
    if (loading) return loading;
    const choice = get().resolve();
    if (!choice) return Promise.reject(new Error("No local AI engine available"));

    const onProgress = (progress: LoadProgress) => set({ status: { kind: "loading", progress } });
    onProgress({ progress: null });
    loading = (async () => {
      if (choice.engine === "chrome") {
        const { createChromeEngine } = await import("./chrome-engine.client");
        return createChromeEngine(onProgress);
      }
      const { createWebLlmEngine } = await import("./webllm-engine.client");
      return createWebLlmEngine(get().webLlmModel, onProgress);
    })()
      .then((engine) => {
        set({ status: { kind: "ready", engine } });
        return engine;
      })
      .catch((error: unknown) => {
        set({ status: { kind: "error", error } });
        throw error;
      })
      .finally(() => {
        loading = null;
      });
    return loading;
  },

  setPreference: (preference) => {
    try {
      localStorage.setItem(PREF_KEY, preference);
    } catch {
      // Preference just won't persist.
    }
    const { status } = get();
    if (status.kind === "ready") status.engine.dispose();
    set({ preference, status: { kind: "idle" } });
  },
}));

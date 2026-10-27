import { create } from "zustand";

import type { Availability, LlmEngine, LoadProgress } from "./engine";
import { defaultWebLlmModel, type WebLlmModelId, webLlmModels } from "./models";

export type EnginePreference = "auto" | "chrome" | "webllm";

type Status =
  | { kind: "idle" }
  | { kind: "loading"; progress: LoadProgress }
  | { kind: "ready"; engine: LlmEngine }
  | { kind: "error"; error: unknown };

interface AiState {
  availability: { chrome: Availability; webllm: Availability } | null;
  cachedModels: WebLlmModelId[];
  preference: EnginePreference;
  webLlmModel: WebLlmModelId;
  status: Status;
  detect: () => Promise<void>;
  /** Which backend `load` would use, given availability and preference. */
  resolve: () => { engine: "chrome" | "webllm"; needsDownload: boolean } | null;
  load: () => Promise<LlmEngine>;
  setPreference: (preference: EnginePreference, model?: WebLlmModelId) => void;
}

const PREF_KEY = "ai-preference";
const MODEL_KEY = "ai-webllm-model";

function readPreference(): { preference: EnginePreference; webLlmModel: WebLlmModelId } {
  try {
    const v = localStorage.getItem(PREF_KEY);
    const m = localStorage.getItem(MODEL_KEY);
    return {
      preference: v === "chrome" || v === "webllm" ? v : "auto",
      webLlmModel: webLlmModels.find((x) => x.id === m)?.id ?? defaultWebLlmModel,
    };
  } catch {
    return { preference: "auto", webLlmModel: defaultWebLlmModel };
  }
}

let loading: Promise<LlmEngine> | null = null;

export const useAi = create<AiState>()((set, get) => ({
  availability: null,
  cachedModels: [],
  preference: "auto",
  webLlmModel: defaultWebLlmModel,
  status: { kind: "idle" },

  detect: async () => {
    const [{ chromeAvailability }, { webLlmAvailability }] = await Promise.all([
      import("./chrome-engine.client"),
      import("./webllm-engine.client"),
    ]);
    const [chrome, webllm] = await Promise.all([chromeAvailability(), webLlmAvailability()]);
    set({ availability: { chrome, webllm: webllm.availability }, cachedModels: webllm.cached, ...readPreference() });
  },

  resolve: () => {
    const { availability, preference, cachedModels, webLlmModel } = get();
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
    if (!pick) return null;
    const needsDownload = pick === "webllm" ? !cachedModels.includes(webLlmModel) : availability.chrome === "download";
    return { engine: pick, needsDownload };
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
        const cached = get().cachedModels;
        const model = get().webLlmModel;
        set({
          status: { kind: "ready", engine },
          cachedModels: engine.id === "webllm" && !cached.includes(model) ? [...cached, model] : cached,
        });
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

  setPreference: (preference, model) => {
    const webLlmModel = model ?? get().webLlmModel;
    try {
      localStorage.setItem(PREF_KEY, preference);
      localStorage.setItem(MODEL_KEY, webLlmModel);
    } catch {
      // Preference just won't persist.
    }
    const { status } = get();
    if (status.kind === "ready") status.engine.dispose();
    set({ preference, webLlmModel, status: { kind: "idle" } });
  },
}));

import { create } from "zustand";

import type { Availability, LlmEngine, LoadProgress } from "./engine";
import { chromeAvailability, createChromeEngine, createWebLlmEngine, webLlmAvailability } from "./engines.client";
import { type DeviceInfo, isModelKey, type ModelKey, recommendedModel, variantFor } from "./models";

export type EnginePreference = "auto" | "chrome" | "webllm";

type Status =
  | { kind: "idle" }
  | { kind: "loading"; progress: LoadProgress }
  | { kind: "ready"; engine: LlmEngine }
  | { kind: "error"; error: unknown };

interface AiState {
  availability: { chrome: Availability; webllm: Availability } | null;
  device: DeviceInfo | null;
  /** Concrete WebLLM build ids already in the browser cache. */
  cachedModels: string[];
  preference: EnginePreference;
  /** Model the user picked; null means "recommended for this device". */
  webLlmModel: ModelKey | null;
  status: Status;
  detect: () => Promise<void>;
  /** The WebLLM model that would load, after applying the device recommendation. */
  activeModel: () => ModelKey | null;
  /** Which backend `load` would use, given availability and preference. */
  resolve: () => { engine: "chrome" | "webllm"; needsDownload: boolean } | null;
  load: () => Promise<LlmEngine>;
  setPreference: (preference: EnginePreference, model?: ModelKey | null) => void;
}

const PREF_KEY = "ai-preference";
const MODEL_KEY = "ai-webllm-model";

function readPreference(): { preference: EnginePreference; webLlmModel: ModelKey | null } {
  try {
    const v = localStorage.getItem(PREF_KEY);
    const m = localStorage.getItem(MODEL_KEY);
    return { preference: v === "chrome" || v === "webllm" ? v : "auto", webLlmModel: isModelKey(m) ? m : null };
  } catch {
    return { preference: "auto", webLlmModel: null };
  }
}

let loading: Promise<LlmEngine> | null = null;

export const useAi = create<AiState>()((set, get) => ({
  availability: null,
  device: null,
  cachedModels: [],
  preference: "auto",
  webLlmModel: null,
  status: { kind: "idle" },

  detect: async () => {
    const [chrome, webllm] = await Promise.all([chromeAvailability(), webLlmAvailability()]);
    set({
      availability: { chrome, webllm: webllm.availability },
      device: webllm.device,
      cachedModels: webllm.cached,
      ...readPreference(),
    });
  },

  activeModel: () => {
    const { device, webLlmModel, cachedModels } = get();
    return webLlmModel ?? (device ? recommendedModel(device, cachedModels) : null);
  },

  resolve: () => {
    const { availability, preference, cachedModels, device } = get();
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
    const model = get().activeModel();
    const needsDownload =
      pick === "webllm"
        ? !(model && device && cachedModels.includes(variantFor(model, device).id))
        : availability.chrome === "download";
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
      if (choice.engine === "chrome") return createChromeEngine(onProgress);
      const { device } = get();
      const model = get().activeModel();
      if (!device || !model) throw new Error("Device not detected");
      const variant = variantFor(model, device);
      const engine = await createWebLlmEngine(variant.id, variant.name, onProgress);
      const cached = get().cachedModels;
      if (!cached.includes(variant.id)) set({ cachedModels: [...cached, variant.id] });
      return engine;
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

  setPreference: (preference, model) => {
    const webLlmModel = model === undefined ? get().webLlmModel : model;
    try {
      localStorage.setItem(PREF_KEY, preference);
      if (webLlmModel) localStorage.setItem(MODEL_KEY, webLlmModel);
      else localStorage.removeItem(MODEL_KEY);
    } catch {
      // Preference just won't persist.
    }
    const { status } = get();
    if (status.kind === "ready") status.engine.dispose();
    set({ preference, webLlmModel, status: { kind: "idle" } });
  },
}));

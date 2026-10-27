/**
 * Local models offered through WebLLM, lightest first. Each has an f16 build
 * (smaller, needs the WebGPU `shader-f16` feature) and an f32 fallback.
 * Sizes are WebLLM's `vram_required_MB`, roughly the download size too.
 */
export const webLlmModels = [
  { key: "qwen3-0.6b", name: "Qwen3 0.6B", f16: ["Qwen3-0.6B-q4f16_1-MLC", 1403], f32: ["Qwen3-0.6B-q4f32_1-MLC", 1925] },
  { key: "qwen3.5-2b", name: "Qwen3.5 2B", f16: ["Qwen3.5-2B-q4f16_1-MLC", 2245], f32: ["Qwen3.5-2B-q4f32_1-MLC", 2592] },
  { key: "gemma-4-e2b", name: "Gemma 4 E2B", f16: ["gemma-4-E2B-it-q4f16_1-MLC", 3387], f32: ["gemma-4-E2B-it-q4f32_1-MLC", 3863] },
  { key: "qwen3-4b", name: "Qwen3 4B", f16: ["Qwen3-4B-q4f16_1-MLC", 3432], f32: ["Qwen3-4B-q4f32_1-MLC", 4328] },
  { key: "qwen3.5-4b", name: "Qwen3.5 4B", f16: ["Qwen3.5-4B-q4f16_1-MLC", 3868], f32: ["Qwen3.5-4B-q4f32_1-MLC", 4680] },
  { key: "qwen3-8b", name: "Qwen3 8B", f16: ["Qwen3-8B-q4f16_1-MLC", 5696], f32: ["Qwen3-8B-q4f32_1-MLC", 6853] },
  { key: "qwen3.5-9b", name: "Qwen3.5 9B", f16: ["Qwen3.5-9B-q4f16_1-MLC", 6433], f32: ["Qwen3.5-9B-q4f32_1-MLC", 7545] },
] as const;

export type ModelKey = (typeof webLlmModels)[number]["key"];

/**
 * Recommendation order, best first, limited to models we evaluated on the
 * extraction pipeline (same Spanish test text, Oct 2026): Gemma 4 E2B got
 * every field and highlight right; Qwen3.5 2B found highlights but missed the
 * name; Qwen3 0.6B got the core facts in 8 s but no highlights. Bigger models
 * stay selectable but aren't recommended until evaluated.
 */
const RECOMMENDATION_ORDER: ModelKey[] = ["gemma-4-e2b", "qwen3.5-2b", "qwen3-0.6b"];

export function isModelKey(value: unknown): value is ModelKey {
  return webLlmModels.some((m) => m.key === value);
}

/** What the browser tells us about the hardware. All of it is best effort. */
export interface DeviceInfo {
  /** `navigator.deviceMemory` in GB (Chromium only, capped at 8); null when unknown. */
  memoryGB: number | null;
  /** WebGPU `shader-f16` support. */
  f16: boolean;
  mobile: boolean;
  /** Free browser storage for model weights (quota minus usage), in MB; null when unknown. */
  storageMB: number | null;
}

/** The concrete WebLLM build for this device. */
export function variantFor(key: ModelKey, device: Pick<DeviceInfo, "f16">) {
  const model = webLlmModels.find((m) => m.key === key) ?? webLlmModels[0];
  const [id, sizeMB] = device.f16 ? model.f16 : model.f32;
  return { id, sizeMB, name: model.name };
}

/**
 * Memory we're comfortable asking a model to use. deviceMemory tops out at 8,
 * so "8" means "8 GB or more" and anything heavier is flagged rather than hidden.
 */
export function memoryBudgetMB(device: DeviceInfo): number {
  if (device.mobile) return 1500;
  if (device.memoryGB === null) return 2600;
  if (device.memoryGB <= 2) return 0;
  if (device.memoryGB <= 4) return 1500;
  if (device.memoryGB < 8) return 2600;
  return 4000;
}

/** Too little memory for any local model to be a good experience. */
export function isLimitedDevice(device: DeviceInfo): boolean {
  return memoryBudgetMB(device) < 1500;
}

export type ModelTag = "recommended" | "lightest" | "heavy" | "tooHeavy" | "noSpace";

/**
 * Labels shown next to each model for this device. `cached` lists builds
 * already downloaded, which need no free storage.
 */
export function tagModels(device: DeviceInfo, cached: readonly string[] = []): Record<ModelKey, ModelTag[]> {
  const budget = memoryBudgetMB(device);
  const sizes = webLlmModels.map((m) => {
    const variant = variantFor(m.key, device);
    const fitsStorage = cached.includes(variant.id) || device.storageMB === null || variant.sizeMB <= device.storageMB;
    return { key: m.key, size: variant.sizeMB, fitsStorage };
  });
  const fits = new Set(sizes.filter((m) => m.size <= budget && m.fitsStorage).map((m) => m.key));
  const recommended = RECOMMENDATION_ORDER.find((key) => fits.has(key)) ?? sizes[0]?.key;
  const lightest = sizes[0]?.key;

  return Object.fromEntries(
    sizes.map(({ key, size, fitsStorage }) => {
      const tags: ModelTag[] = [];
      if (!fitsStorage) tags.push("noSpace");
      if (key === recommended && budget > 0) tags.push("recommended");
      if (key === lightest) tags.push("lightest");
      if (size > budget * 1.6) tags.push("tooHeavy");
      else if (size > budget) tags.push("heavy");
      return [key, tags];
    }),
  ) as Record<ModelKey, ModelTag[]>;
}

export function recommendedModel(device: DeviceInfo, cached: readonly string[] = []): ModelKey {
  const tags = tagModels(device, cached);
  return webLlmModels.find((m) => tags[m.key].includes("recommended"))?.key ?? webLlmModels[0].key;
}

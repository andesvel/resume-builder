import type { ChatCompletionRequestNonStreaming } from "@mlc-ai/web-llm";

import type { Availability, GenerateOptions, LlmEngine, LoadProgress } from "./engine";
import { parseJsonReply, stripReasoning } from "./output";
import { type DeviceInfo, webLlmModels } from "./models";

type GpuAdapter = { features: Set<string>; info?: { vendor?: string; architecture?: string; description?: string } };
type Gpu = { requestAdapter(): Promise<GpuAdapter | null> };

export interface GpuInfo {
  webgpu: boolean;
  vendor: string | null;
  architecture: string | null;
}

/** Every build id we offer (both precisions), so caches from either show up. */
const allBuildIds = webLlmModels.flatMap((m) => [m.f16[0], m.f32[0]]);

/** What the browser reports about this device, before any user override. */
export async function detectDevice(): Promise<{ device: DeviceInfo; gpu: GpuInfo }> {
  const device: DeviceInfo = {
    memoryGB: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
    f16: false,
    mobile: /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent),
    storageMB: null,
  };
  const gpu: GpuInfo = { webgpu: false, vendor: null, architecture: null };
  try {
    const { quota, usage } = await navigator.storage.estimate();
    if (quota !== undefined) device.storageMB = Math.round((quota - (usage ?? 0)) / 1024 / 1024);
  } catch {
    // Unknown free space: don't flag anything.
  }
  try {
    const adapter = await (navigator as Navigator & { gpu?: Gpu }).gpu?.requestAdapter();
    if (adapter) {
      gpu.webgpu = true;
      gpu.vendor = adapter.info?.vendor || null;
      gpu.architecture = adapter.info?.architecture || null;
      device.f16 = adapter.features.has("shader-f16");
    }
  } catch {
    // No usable GPU.
  }
  return { device, gpu };
}

/** Build ids already downloaded to the browser cache. */
export async function cachedBuilds(): Promise<string[]> {
  const { hasModelInCache } = await import("@mlc-ai/web-llm");
  const flags = await Promise.all(allBuildIds.map((id) => hasModelInCache(id).catch(() => false)));
  return allBuildIds.filter((_, i) => flags[i]);
}

/** Bytes each cached build occupies, from the stored responses' Content-Length. */
export async function cachedBuildSizes(): Promise<Record<string, number>> {
  const { prebuiltAppConfig } = await import("@mlc-ai/web-llm");
  const cache = await caches.open("webllm/model");
  const requests = await cache.keys();
  const sizes: Record<string, number> = {};
  for (const id of allBuildIds) {
    const base = prebuiltAppConfig.model_list.find((m) => m.model_id === id)?.model;
    if (!base) continue;
    let bytes = 0;
    for (const request of requests) {
      if (!request.url.startsWith(base)) continue;
      const response = await cache.match(request);
      bytes += Number(response?.headers.get("Content-Length") ?? 0);
    }
    if (bytes > 0) sizes[id] = bytes;
  }
  return sizes;
}

/**
 * Delete one build. WebLLM's own helper doesn't always remove every weight
 * shard (seen in Safari), so any response still under the model's URL is
 * swept afterwards.
 */
export async function deleteCachedBuild(id: string): Promise<void> {
  const { deleteModelAllInfoInCache, prebuiltAppConfig } = await import("@mlc-ai/web-llm");
  await deleteModelAllInfoInCache(id).catch(() => {});
  const base = prebuiltAppConfig.model_list.find((m) => m.model_id === id)?.model;
  if (!base) return;
  for (const name of await caches.keys()) {
    if (!name.startsWith("webllm/")) continue;
    const cache = await caches.open(name);
    for (const request of await cache.keys()) if (request.url.startsWith(base)) await cache.delete(request);
  }
}

/** Remove every WebLLM cache (weights, configs, compiled libraries). */
export async function clearModelCaches(): Promise<void> {
  for (const key of await caches.keys()) if (key.startsWith("webllm/")) await caches.delete(key);
}

export function webLlmAvailability(gpu: GpuInfo, cached: string[]): Availability {
  if (!gpu.webgpu) return "unsupported";
  return cached.length ? "ready" : "download";
}

/** Open-weights model on WebGPU via WebLLM, running in a Web Worker. Weights are cached by the browser. */
export async function createWebLlmEngine(
  modelId: string,
  name: string,
  onProgress?: (p: LoadProgress) => void,
): Promise<LlmEngine> {
  const { CreateWebWorkerMLCEngine } = await import("@mlc-ai/web-llm");
  const worker = new Worker(new URL("./webllm.worker.ts", import.meta.url), { type: "module" });
  const engine = await CreateWebWorkerMLCEngine(worker, modelId, {
    initProgressCallback: (report) => onProgress?.({ progress: report.progress, text: report.text }),
  });

  const run = async ({ system, prompt }: GenerateOptions, schema?: object) => {
    const request: ChatCompletionRequestNonStreaming = {
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: schema ? 0 : 0.6,
      max_tokens: 1500,
      // Qwen3 "thinking" wastes the small context window on hidden reasoning.
      extra_body: { enable_thinking: false },
      ...(schema ? { response_format: { type: "json_object", schema: JSON.stringify(schema) } } : {}),
    };
    const reply = await engine.chat.completions.create(request);
    return reply.choices[0]?.message.content ?? "";
  };

  return {
    id: "webllm",
    label: name,
    generateJson: async (options) => parseJsonReply(await run(options, options.schema)),
    generateText: async (options) => stripReasoning(await run(options)),
    dispose: () => {
      void engine.unload();
      worker.terminate();
    },
  };
}

import type { ChatCompletionRequestNonStreaming } from "@mlc-ai/web-llm";

import type { Availability, GenerateOptions, LlmEngine, LoadProgress } from "./engine";
import { parseJsonReply, stripReasoning } from "./output";
import { type DeviceInfo, variantFor, webLlmModels } from "./models";

type GpuAdapter = { features: Set<string> };
type Gpu = { requestAdapter(): Promise<GpuAdapter | null> };

/** WebGPU support, what the device can handle, and which builds are already cached. */
export async function webLlmAvailability(): Promise<{ availability: Availability; device: DeviceInfo; cached: string[] }> {
  const device: DeviceInfo = {
    memoryGB: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
    f16: false,
    mobile: /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent),
  };
  const unsupported = { availability: "unsupported" as const, device, cached: [] };
  const gpu = (navigator as Navigator & { gpu?: Gpu }).gpu;
  if (!gpu) return unsupported;
  try {
    const adapter = await gpu.requestAdapter();
    if (!adapter) return unsupported;
    device.f16 = adapter.features.has("shader-f16");
  } catch {
    return unsupported;
  }
  const { hasModelInCache } = await import("@mlc-ai/web-llm");
  const ids = webLlmModels.map((m) => variantFor(m.key, device).id);
  const flags = await Promise.all(ids.map((id) => hasModelInCache(id).catch(() => false)));
  const cached = ids.filter((_, i) => flags[i]);
  return { availability: cached.length ? "ready" : "download", device, cached };
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

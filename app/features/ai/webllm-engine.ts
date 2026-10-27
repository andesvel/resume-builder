import type { ChatCompletionRequestNonStreaming } from "@mlc-ai/web-llm";

import type { Availability, GenerateOptions, LlmEngine, LoadProgress } from "./engine";
import { parseJsonReply, stripReasoning } from "./output";
import { webLlmModels, type WebLlmModelId } from "./models";

/** WebGPU support plus which models are already in the browser cache. */
export async function webLlmAvailability(): Promise<{ availability: Availability; cached: WebLlmModelId[] }> {
  const unsupported = { availability: "unsupported" as const, cached: [] };
  if (!("gpu" in navigator)) return unsupported;
  try {
    const adapter = await (navigator as Navigator & { gpu: { requestAdapter(): Promise<unknown> } }).gpu.requestAdapter();
    if (!adapter) return unsupported;
  } catch {
    return unsupported;
  }
  const { hasModelInCache } = await import("@mlc-ai/web-llm");
  const flags = await Promise.all(webLlmModels.map((m) => hasModelInCache(m.id).catch(() => false)));
  const cached = webLlmModels.filter((_, i) => flags[i]).map((m) => m.id);
  return { availability: cached.length ? "ready" : "download", cached };
}

/** Open-weights model on WebGPU via WebLLM, running in a Web Worker. Weights are cached by the browser. */
export async function createWebLlmEngine(modelId: WebLlmModelId, onProgress?: (p: LoadProgress) => void): Promise<LlmEngine> {
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

  const name = webLlmModels.find((m) => m.id === modelId)?.name ?? modelId;
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

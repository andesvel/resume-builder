export interface WebLlmModel {
  id: string;
  name: string;
  /** Approximate download / GPU memory, from WebLLM's model registry. */
  sizeMB: number;
}

export const webLlmModels = [
  { id: "Qwen3-1.7B-q4f16_1-MLC", name: "Qwen3 1.7B", sizeMB: 2040 },
  { id: "Qwen3-0.6B-q4f16_1-MLC", name: "Qwen3 0.6B", sizeMB: 1400 },
] as const satisfies readonly WebLlmModel[];

export type WebLlmModelId = (typeof webLlmModels)[number]["id"];
export const defaultWebLlmModel: WebLlmModelId = "Qwen3-1.7B-q4f16_1-MLC";

/**
 * Everything AI runs locally in the browser behind this interface. The app
 * never needs to know which backend answered.
 */
export type EngineId = "chrome" | "webllm";

export interface GenerateOptions {
  system: string;
  prompt: string;
  signal?: AbortSignal;
}

export interface LlmEngine {
  id: EngineId;
  /** Human-readable model name, e.g. "Gemini Nano". */
  label: string;
  /** Constrained generation: the result is parsed JSON matching `schema`. */
  generateJson(options: GenerateOptions & { schema: object }): Promise<unknown>;
  generateText(options: GenerateOptions): Promise<string>;
  dispose(): void;
}

export interface LoadProgress {
  /** 0..1, or null while unknown. */
  progress: number | null;
  text?: string;
}

export type Availability =
  /** Ready without a download. */
  | "ready"
  /** Works, but needs a one-time model download first. */
  | "download"
  | "unsupported";

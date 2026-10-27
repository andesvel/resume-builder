// Minimal typings for Chrome's built-in Prompt API (Gemini Nano).
// https://developer.chrome.com/docs/ai/prompt-api

type LanguageModelAvailability = "unavailable" | "downloadable" | "downloading" | "available";

interface LanguageModelExpected {
  type: "text";
  languages?: string[];
}

interface LanguageModelMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface LanguageModelCreateOptions {
  initialPrompts?: LanguageModelMessage[];
  expectedInputs?: LanguageModelExpected[];
  expectedOutputs?: LanguageModelExpected[];
  signal?: AbortSignal;
  monitor?: (monitor: EventTarget) => void;
}

interface LanguageModelPromptOptions {
  responseConstraint?: object;
  signal?: AbortSignal;
}

interface LanguageModelSession {
  prompt(input: string, options?: LanguageModelPromptOptions): Promise<string>;
  destroy(): void;
}

interface LanguageModelStatic {
  availability(options?: Omit<LanguageModelCreateOptions, "initialPrompts" | "monitor" | "signal">): Promise<LanguageModelAvailability>;
  create(options?: LanguageModelCreateOptions): Promise<LanguageModelSession>;
}

declare var LanguageModel: LanguageModelStatic | undefined;

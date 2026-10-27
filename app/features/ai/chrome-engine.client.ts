import type { Availability, GenerateOptions, LlmEngine, LoadProgress } from "./engine";
import { parseJsonReply, stripReasoning } from "./output";

const io = {
  expectedInputs: [{ type: "text" as const, languages: ["en", "es"] }],
  expectedOutputs: [{ type: "text" as const, languages: ["en", "es"] }],
};

export async function chromeAvailability(): Promise<Availability> {
  if (typeof LanguageModel === "undefined") return "unsupported";
  try {
    const status = await LanguageModel.availability(io);
    if (status === "available") return "ready";
    if (status === "downloadable" || status === "downloading") return "download";
    return "unsupported";
  } catch {
    return "unsupported";
  }
}

/** Gemini Nano via Chrome's Prompt API. Each call gets a fresh session so prompts never leak context. */
export async function createChromeEngine(onProgress?: (p: LoadProgress) => void): Promise<LlmEngine> {
  const api = LanguageModel;
  if (!api) throw new Error("Prompt API unavailable");

  // Creating a session once triggers (and waits for) the model download.
  const warmup = await api.create({
    ...io,
    monitor: (m) =>
      m.addEventListener("downloadprogress", (e) => onProgress?.({ progress: (e as ProgressEvent).loaded })),
  });
  warmup.destroy();

  const run = async ({ system, prompt, signal }: GenerateOptions, responseConstraint?: object) => {
    const session = await api.create({ ...io, initialPrompts: [{ role: "system", content: system }], signal });
    try {
      return await session.prompt(prompt, { responseConstraint, signal });
    } finally {
      session.destroy();
    }
  };

  return {
    id: "chrome",
    label: "Gemini Nano",
    generateJson: async (options) => parseJsonReply(await run(options, options.schema)),
    generateText: async (options) => stripReasoning(await run(options)),
    dispose: () => {},
  };
}

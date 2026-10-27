import type { Locale } from "~/i18n/config";
import type { Resume } from "~/features/resume/schema";

import type { LlmEngine } from "./engine";
import { type Extraction, extractionJsonSchema, parseExtraction } from "./extraction-schema";
import { extractContacts } from "./heuristics";
import { type MergeSummary, mergeExtraction } from "./merge";

/** Keeps each request well inside small models' 4k-token context. */
const CHUNK_CHARS = 2400;

const LANGUAGE_NAME: Record<Locale, string> = { en: "English", es: "Spanish" };

export function extractionSystemPrompt(locale: Locale): string {
  return [
    "You turn what a person wrote about themselves into resume data. Reply with JSON only.",
    "Rules:",
    "- Include only facts the person stated. Never invent companies, titles, dates, numbers or skills.",
    "- Leave out any field that was not mentioned.",
    "- Fix spelling and grammar, but keep the person's wording and meaning.",
    `- Write every text value in ${LANGUAGE_NAME[locale]}, except proper names and technologies.`,
    '- Dates: "YYYY-MM" or "YYYY". For a job they still have, set "current": true.',
    "- highlights: short achievement phrases that start with a verb, one fact each.",
    "- skills: individual tools, technologies or abilities, e.g. \"React\", \"SQL\", \"Public speaking\".",
    "- headline: their professional title, e.g. \"Frontend Developer\".",
  ].join("\n");
}

/** Split long input on paragraph/sentence boundaries. */
export function chunkText(text: string, max = CHUNK_CHARS): string[] {
  const parts = text.split(/\n{2,}|(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ])/);
  const chunks: string[] = [];
  let current = "";
  for (const part of parts) {
    if (current && current.length + part.length + 1 > max) {
      chunks.push(current);
      current = "";
    }
    current = current ? `${current}\n${part}` : part;
    while (current.length > max) {
      chunks.push(current.slice(0, max));
      current = current.slice(max);
    }
  }
  if (current.trim()) chunks.push(current);
  return chunks;
}

export async function extract(engine: LlmEngine, text: string, locale: Locale, signal?: AbortSignal): Promise<Extraction[]> {
  const system = extractionSystemPrompt(locale);
  const schema = extractionJsonSchema();
  const results: Extraction[] = [];
  for (const chunk of chunkText(text.trim())) {
    signal?.throwIfAborted();
    results.push(parseExtraction(await engine.generateJson({ system, prompt: chunk, schema, signal })));
  }
  // Regex results go last so verbatim contacts win over anything the model rewrote.
  results.push(extractContacts(text));
  return results;
}

function combine(a: MergeSummary, b: MergeSummary): MergeSummary {
  const add = (x: Record<string, number>, y: Record<string, number>) => {
    const out = { ...x };
    for (const [k, v] of Object.entries(y)) out[k] = (out[k] ?? 0) + v;
    return out;
  };
  return {
    updatedFields: [...new Set([...a.updatedFields, ...b.updatedFields])],
    added: add(a.added, b.added),
    updated: add(a.updated, b.updated),
  };
}

/** Free text in, updated resume and a summary of what changed out. */
export async function applyFreeText(engine: LlmEngine, resume: Resume, text: string, signal?: AbortSignal) {
  const extractions = await extract(engine, text, resume.locale, signal);
  let summary: MergeSummary = { updatedFields: [], added: {}, updated: {} };
  let next = resume;
  for (const x of extractions) {
    const merged = mergeExtraction(next, x);
    next = merged.resume;
    summary = combine(summary, merged.summary);
  }
  return { resume: next, summary };
}

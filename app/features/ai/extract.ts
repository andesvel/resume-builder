import type { Locale } from "~/i18n/config";
import type { Resume } from "~/features/resume/schema";

import type { LlmEngine } from "./engine";
import { type Extraction, extractionJsonSchema, extractionSchema, parseExtraction } from "./extraction-schema";
import { groundExtraction, isGrounded } from "./grounding";
import { matchKey } from "./merge";
import { polishExtraction, titlesOf } from "./polish";
import { extractContacts } from "./heuristics";
import { type MergeSummary, mergeExtraction } from "./merge";

/** Keeps each request well inside small models' 4k-token context. */
const CHUNK_CHARS = 2400;

const LANGUAGE_NAME: Record<Locale, string> = { en: "English", es: "Spanish" };

type Key = keyof Extraction;

interface Pass {
  keys: Key[];
  task: string;
  /** Skip the pass when the text clearly has nothing for it; small models invent rather than leave blanks. */
  when?: RegExp;
}

/** One focused question per pass: small models are far more accurate on narrow tasks. */
const PASSES: Pass[] = [
  {
    keys: ["name", "headline", "location", "summary"],
    task: 'Extract the person\'s full name, professional title ("headline"), and city/country. Fill "summary" only if they wrote sentences describing their profile; otherwise omit it.',
  },
  {
    keys: ["experience"],
    task: 'List every job they mention, one item per company: company, role, location, startDate, endDate, current. "highlights": only the things they say they did there, kept close to their own words; leave it empty if they said none.',
    when: /\b(trabaj|work|empresa|compan|cargo|role|job|empleo|puesto|freelanc|consult|desde|since|until|hasta|intern|pasant|practicante|lider|lead|manag|desarroll|develop|engineer|ingenier|analista|analyst|design|sal[ií]|left|renunci|quit|ingres|joined|empec|comenc|start|(19|20)\d{2}|at\s+[A-Z])/i,
  },
  {
    keys: ["education"],
    task: "List their studies: institution, degree, field, startDate, endDate.",
    when: /\b(estudi|study|studied|universi|college|school|escuela|colegio|instituto|institute|degree|grado|t[ií]tulo|licenci|bachelor|master|maestr|mba|phd|doctor|bootcamp|carrera|graduat|egresad)/i,
  },
  {
    keys: ["skills", "languages"],
    task: '"skills": each tool, technology or ability they mention, as short names. "languages": spoken languages and level.',
  },
  {
    keys: ["projects", "certifications"],
    task: '"projects": named personal or open-source projects. "certifications": certificates or licenses they hold.',
    when: /\b(proyecto|project|side|open[- ]source|github|app\s+llamad|certific|license|licencia|curso|course|aws|azure|gcp|scrum|pmp|toefl|ielts)/i,
  },
];

/**
 * Once a profile field is filled, a follow-up input only replaces it when the
 * text is clearly about that field; otherwise models "fill" it with whatever
 * was mentioned (a company as the location, etc.).
 */
const PROFILE_CUES = {
  name: /\b(me llamo|mi nombre|my name|soy [A-ZÁÉÍÓÚÑ]|i'?m [A-Z]|i am [A-Z]|nombre completo|full name)/,
  headline: /\b(headline|titular|t[ií]tulo profesional|mi (cargo|rol|perfil) (es|actual)|i work as|trabajo como|me dedico)/i,
  location: /\b(vivo en|resido en|radicad[oa]|ubicad[oa]|me mud[eé]|based in|i live|located in|moved to|desde [A-ZÁÉÍÓÚÑ][a-z]+,)/i,
  summary: /\b(summary|resumen|perfil profesional|about me|sobre m[ií])\b/i,
} as const;

export function extractionSystemPrompt(locale: Locale, task: string): string {
  return [
    "You extract resume data from what a person wrote about themselves. Reply with JSON only.",
    `Task: ${task}`,
    "Rules:",
    "- Use only facts stated in the text. Never invent companies, titles, dates, numbers or skills.",
    "- Omit fields and items that are not in the text. An empty object {} is a valid answer.",
    "- Fix spelling and grammar, but keep the person's wording and meaning.",
    `- Write text values in ${LANGUAGE_NAME[locale]}; keep proper names and technologies as written.`,
    '- Dates as "YYYY-MM" or "YYYY". For a role they still have, set "current": true.',
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

export interface ExtractOptions {
  signal?: AbortSignal;
  onStep?: (done: number, total: number) => void;
  /** Profile fields already filled; they are only replaced when the text asks for it. */
  hasProfile?: Record<keyof typeof PROFILE_CUES, boolean>;
}

export async function extract(engine: LlmEngine, text: string, locale: Locale, options: ExtractOptions = {}): Promise<Extraction[]> {
  const { signal, onStep, hasProfile } = options;
  const chunks = chunkText(text.trim());
  const jobs = chunks.flatMap((chunk) => PASSES.filter((p) => !p.when || p.when.test(chunk)).map((pass) => ({ chunk, pass })));
  const results: Extraction[] = [];

  for (const [i, { chunk, pass }] of jobs.entries()) {
    signal?.throwIfAborted();
    onStep?.(i, jobs.length);
    const mask = Object.fromEntries(pass.keys.map((k) => [k, true])) as Partial<Record<Key, true>>;
    const schema = extractionJsonSchema(extractionSchema.pick(mask));
    const raw = await engine.generateJson({ system: extractionSystemPrompt(locale, pass.task), prompt: chunk, schema, signal });
    const picked = Object.fromEntries(Object.entries(parseExtraction(raw)).filter(([k]) => pass.keys.includes(k as Key)));
    results.push(groundExtraction(picked, chunk));
  }
  onStep?.(jobs.length, jobs.length);

  const titles = titlesOf(results);
  const polished = results.map((x) => polishExtraction(x, locale, titles));

  for (const x of polished) {
    if (x.name && !isGrounded(x.name, text)) delete x.name;
    for (const field of Object.keys(PROFILE_CUES) as (keyof typeof PROFILE_CUES)[]) {
      const value = x[field];
      if (!value) continue;
      // A name or location equal to a company/school the text mentions is a mix-up.
      const isOrganization = (field === "name" || field === "location") && titles.has(matchKey(value));
      if (isOrganization || (hasProfile?.[field] && !PROFILE_CUES[field].test(text))) delete x[field];
    }
  }
  // Regex results go last so verbatim contacts win over anything the model rewrote.
  polished.push(extractContacts(text));
  return polished;
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
export async function applyFreeText(engine: LlmEngine, resume: Resume, text: string, options: Omit<ExtractOptions, "hasProfile"> = {}) {
  const filled = (v: string) => v.trim().length > 0;
  const b = resume.basics;
  const hasProfile = { name: filled(b.name), headline: filled(b.headline), location: filled(b.location), summary: filled(b.summary) };
  const extractions = await extract(engine, text, resume.locale, { ...options, hasProfile });
  let summary: MergeSummary = { updatedFields: [], added: {}, updated: {} };
  let next = resume;
  for (const x of extractions) {
    const merged = mergeExtraction(next, x);
    next = merged.resume;
    summary = combine(summary, merged.summary);
  }
  return { resume: next, summary };
}

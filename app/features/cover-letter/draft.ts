import type { Locale } from "~/i18n/config";
import { getT } from "~/i18n";
import type { LlmEngine } from "~/features/ai/engine";
import { formatDateRange, nonEmpty } from "~/features/resume/format";
import type { Resume } from "~/features/resume/schema";

/** Small models have ~4k tokens: send a compact fact sheet, not the whole resume. */
const MAX_FACTS = 1800;
const MAX_JOB = 1500;

export function resumeFacts(resume: Resume): string {
  const { basics } = resume;
  const lines = [
    `Name: ${basics.name}`,
    basics.headline && `Title: ${basics.headline}`,
    basics.summary && `Summary: ${basics.summary}`,
    ...resume.experience.slice(0, 4).flatMap((e) => [
      `Job: ${[e.role, e.company].filter(Boolean).join(" at ")} (${formatDateRange(e.startDate, e.endDate, resume.locale, e.current)})`,
      ...nonEmpty(e.highlights).slice(0, 3).map((h) => `  - ${h}`),
    ]),
    ...resume.education.slice(0, 2).map((e) => `Education: ${[e.degree, e.field, e.institution].filter(Boolean).join(", ")}`),
    resume.skills.length && `Skills: ${resume.skills.flatMap((g) => g.keywords).slice(0, 20).join(", ")}`,
  ].filter(Boolean);
  return lines.join("\n").slice(0, MAX_FACTS);
}

/** Written in the target language: small models follow the prompt's language more than an instruction about it. */
const SYSTEM: Record<Locale, string[]> = {
  en: [
    "You write short, sincere cover letters in English, in the first person.",
    "Use only facts from the candidate's resume. Never invent employers, numbers, degrees or skills.",
    "Write 3 short paragraphs: interest in the role, the most relevant experience, and a closing sentence.",
    "Plain text only. No headings or labels, no greeting, no sign-off, no placeholders like [Company].",
  ],
  es: [
    "Escribes cartas de presentación breves y sinceras en español, en primera persona.",
    "Usa solo datos del CV del candidato. Nunca inventes empresas, cifras, títulos ni habilidades.",
    "Escribe 3 párrafos cortos: interés en el cargo, la experiencia más relevante y una frase de cierre.",
    "Solo texto plano. Sin títulos ni etiquetas, sin saludo, sin despedida y sin marcadores como [Empresa].",
  ],
};

const LABELS: Record<Locale, { position: string; company: string; job: string; resume: string; none: string }> = {
  en: { position: "Position", company: "Company", job: "Job description", resume: "Candidate resume", none: "(not given)" },
  es: { position: "Cargo", company: "Empresa", job: "Descripción de la vacante", resume: "CV del candidato", none: "(no indicado)" },
};

export function coverLetterPrompt(resume: Resume) {
  const { coverLetter: letter, locale } = resume;
  const l = LABELS[locale];
  const system = SYSTEM[locale].join("\n");
  const prompt = [
    `${l.position}: ${letter.role || l.none}`,
    `${l.company}: ${letter.company || l.none}`,
    letter.jobDescription && `${l.job}:\n${letter.jobDescription.slice(0, MAX_JOB)}`,
    `${l.resume}:\n${resumeFacts(resume)}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  return { system, prompt };
}

/** Remove what the template already adds (greeting, sign-off) and any leftover placeholders. */
export function cleanDraft(text: string, resume: Resume): string {
  const t = getT(resume.locale);
  return text
    // Section labels small models copy from the instructions.
    .replace(/^[ \t]*(why this role|interest in the role|(the )?most relevant experience|closing( sentence| line)?|inter[eé]s en el cargo|(la )?experiencia m[aá]s relevante|(frase de )?cierre)\s*:\s*/gim, "")
    .replace(/^\s*(dear|estimad[oa]s?(\/a)?|hola|hello|to whom)[^\n]*\n+/i, "")
    .replace(/\n+\s*(sincerely|best regards|kind regards|regards|atentamente|saludos|cordialmente|un saludo)[\s\S]*$/i, "")
    .replace(/\[[^\]]{2,40}\]/g, (m) => (/company|empresa/i.test(m) ? resume.coverLetter.company || m : m))
    .replace(new RegExp(`\\n+${t("letter.closing")}[\\s\\S]*$`), "")
    .trim();
}

export async function draftCoverLetter(engine: LlmEngine, resume: Resume): Promise<string> {
  const { system, prompt } = coverLetterPrompt(resume);
  return cleanDraft(await engine.generateText({ system, prompt }), resume);
}

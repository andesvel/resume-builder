import type { Locale } from "~/i18n/config";

import type { Extraction } from "./extraction-schema";
import { matchKey } from "./merge";

/** Canonical casing for common skills, keyed by matchKey. */
const SKILL_CASING = Object.fromEntries(
  [
    "React", "React Native", "TypeScript", "JavaScript", "Node.js", "Next.js", "Nuxt", "Vue", "Angular", "Svelte",
    "Remix", "Astro", "HTML", "CSS", "Sass", "Tailwind CSS", "Python", "Django", "Flask", "FastAPI", "Go", "Rust",
    "Java", "Spring", "Kotlin", "Swift", "C", "C++", "C#", ".NET", "PHP", "Laravel", "Ruby", "Ruby on Rails",
    "SQL", "PostgreSQL", "MySQL", "SQLite", "MongoDB", "Redis", "GraphQL", "REST", "gRPC", "Docker", "Kubernetes",
    "Terraform", "AWS", "Azure", "GCP", "Firebase", "Supabase", "Cloudflare", "Linux", "Git", "GitHub", "CI/CD",
    "Jest", "Vitest", "Cypress", "Playwright", "Figma", "Excel", "Power BI", "Tableau", "Scrum", "Jira", "Flutter",
    "Express", "NestJS", "Vite", "Webpack", "Redux", "Zustand", "Storybook", "Pandas", "TensorFlow", "PyTorch",
  ].map((s) => [matchKey(s), s]),
);

/** Words that make an item a job title, not a skill ("desarrollador react" -> "React"). */
const ROLE_WORDS =
  /\b(desarrollador(a)?|developer|dev|programador(a)?|programmer|ingenier[oa]|engineer|lead|l[ií]der|manager|gerente|analista|analyst|dise[nñ]ador(a)?|designer|senior|junior|semi ?senior|ssr|sr|jr)\b/gi;

const LANGUAGE_NAMES: Record<string, Record<Locale, string>> = {
  english: { en: "English", es: "Inglés" },
  spanish: { en: "Spanish", es: "Español" },
  french: { en: "French", es: "Francés" },
  portuguese: { en: "Portuguese", es: "Portugués" },
  german: { en: "German", es: "Alemán" },
  italian: { en: "Italian", es: "Italiano" },
  chinese: { en: "Chinese", es: "Chino" },
  japanese: { en: "Japanese", es: "Japonés" },
};
const LANGUAGE_ALIASES: Record<string, string> = {
  english: "english", ingles: "english",
  spanish: "spanish", espanol: "spanish", castellano: "spanish",
  french: "french", frances: "french",
  portuguese: "portuguese", portugues: "portuguese",
  german: "german", aleman: "german",
  italian: "italian", italiano: "italian",
  chinese: "chinese", chino: "chinese", mandarin: "chinese",
  japanese: "japanese", japones: "japanese",
};

const LEVELS: Record<string, Record<Locale, string>> = {
  native: { en: "Native", es: "Nativo" },
  advanced: { en: "Advanced", es: "Avanzado" },
  intermediate: { en: "Intermediate", es: "Intermedio" },
  basic: { en: "Basic", es: "Básico" },
  fluent: { en: "Fluent", es: "Fluido" },
};
const LEVEL_ALIASES: Record<string, string> = {
  native: "native", nativo: "native", nativa: "native", materna: "native", "lenguamaterna": "native",
  advanced: "advanced", avanzado: "advanced",
  intermediate: "intermediate", intermedio: "intermediate",
  basic: "basic", basico: "basic", beginner: "basic", principiante: "basic",
  fluent: "fluent", fluido: "fluent",
};

export const capitalize = (s: string | undefined) => (s ? s.charAt(0).toLocaleUpperCase() + s.slice(1) : s);

export function polishSkill(raw: string): string | null {
  const stripped = raw.replace(ROLE_WORDS, " ").replace(/\s+/g, " ").trim();
  if (!stripped || stripped.split(" ").length > 3) return null;
  return SKILL_CASING[matchKey(stripped)] ?? stripped;
}

/** Titles, degrees and organizations across all passes: none of them is a skill (or a person's name). */
export function titlesOf(extractions: Extraction[]): Set<string> {
  return new Set(
    extractions
      .flatMap((x) => [
        x.headline,
        ...(x.experience ?? []).flatMap((e) => [e.role, e.company]),
        ...(x.education ?? []).flatMap((e) => [e.degree, e.field, e.institution]),
        ...(x.projects ?? []).map((p) => p.name),
      ])
      .filter(Boolean)
      .map((t) => matchKey(t)),
  );
}

/** Deterministic clean-up of model output: casing, canonical names, non-skills. */
export function polishExtraction(x: Extraction, locale: Locale, titles: Set<string> = titlesOf([x])): Extraction {
  const skills = (x.skills ?? [])
    .filter((s) => !titles.has(matchKey(s)))
    .map(polishSkill)
    .filter((s): s is string => Boolean(s));

  return {
    ...x,
    headline: capitalize(x.headline),
    experience: x.experience?.map((e) => ({ ...e, role: capitalize(e.role), highlights: e.highlights?.map((h) => capitalize(h) ?? h) })),
    education: x.education?.map((e) => ({ ...e, degree: capitalize(e.degree), field: capitalize(e.field) })),
    skills: x.skills ? skills : undefined,
    languages: x.languages?.map((l) => {
      const lang = LANGUAGE_ALIASES[matchKey(l.language)];
      const level = LEVEL_ALIASES[matchKey(l.fluency)];
      return {
        language: lang ? LANGUAGE_NAMES[lang]?.[locale] : capitalize(l.language),
        fluency: level ? LEVELS[level]?.[locale] : capitalize(l.fluency),
      };
    }),
  };
}

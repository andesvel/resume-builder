import { normalizeDate } from "./dates";
import type { Extraction } from "./extraction-schema";
import { matchKey } from "./merge";

const fold = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const tokens = (s: string) => fold(s).split(/[^a-z0-9+#]+/).filter((t) => t.length >= 2);

/**
 * True when a proper name (company, project, certification…) actually appears
 * in what the user wrote. Small models invent entities; this drops them.
 */
export function isGrounded(name: string | undefined, source: string): boolean {
  if (!name?.trim()) return false;
  const haystack = matchKey(source);
  if (haystack.includes(matchKey(name))) return true;
  const words = new Set(tokens(source));
  const significant = tokens(name).filter((t) => t.length >= 3);
  return significant.length > 0 && significant.some((t) => words.has(t));
}

/** Institutions are often translated ("Universidad Nacional" -> "National University"), so match on stems. */
function isInstitutionGrounded(name: string | undefined, source: string): boolean {
  if (isGrounded(name, source)) return true;
  const stems = new Set(tokens(source).map((t) => t.slice(0, 4)));
  return tokens(name ?? "").filter((t) => t.length >= 4).some((t) => stems.has(t.slice(0, 4)));
}

const LANGUAGES: string[][] = [
  ["english", "ingles", "inglés"],
  ["spanish", "espanol", "español", "castellano"],
  ["french", "frances", "francés"],
  ["portuguese", "portugues", "portugués"],
  ["german", "aleman", "alemán"],
  ["italian", "italiano"],
  ["chinese", "mandarin", "chino", "mandarín"],
  ["japanese", "japones", "japonés"],
  ["korean", "coreano"],
  ["russian", "ruso"],
  ["arabic", "arabe", "árabe"],
  ["dutch", "holandes", "neerlandes"],
  ["catalan", "catala", "catalán"],
];

function isLanguageGrounded(language: string | undefined, source: string): boolean {
  const key = fold(language ?? "").trim();
  const words = new Set(tokens(source));
  const aliases = LANGUAGES.find((group) => group.some((a) => fold(a) === key)) ?? [key];
  return aliases.some((a) => words.has(fold(a)));
}

const MONTH_NAME =
  "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|ene|abr|ago|dic)[a-z]*\\.?";

/** Month the text gives right next to this year ("enero 2018", "03/2018", "2018-03"), as YYYY-MM. */
function monthFor(year: string, source: string): string | undefined {
  const re = new RegExp(
    `${MONTH_NAME}\\s*(?:de\\s+|del\\s+|of\\s+)?${year}|\\b\\d{1,2}\\s*[/-]\\s*${year}|${year}\\s*[/-]\\s*\\d{1,2}\\b`,
    "gi",
  );
  const found = [...new Set([...source.matchAll(re)].map((m) => normalizeDate(m[0].replace(/\s+(de|del|of)\s+/i, " ")).date))];
  // Ambiguous when the same year appears with different months.
  return found.length === 1 ? found[0] : undefined;
}

/**
 * Keep a date only if its year is in the text, and its month only if the text
 * gives that month. Models like to fill "2020" in as "2020-03".
 */
export function groundDate(date: string | undefined, source: string): string | undefined {
  if (!date) return date;
  const year = date.match(/(19|20)\d{2}/)?.[0];
  if (!year) return /present|actual|current/i.test(date) ? date : undefined;
  if (!source.includes(year)) return undefined;
  // Trust the text over the model for the month.
  return monthFor(year, source) ?? year;
}

const STOPWORDS = new Set(
  "with from that this have para como with para sobre entre desde hasta donde cuando their they them were been also using utilizando".split(" "),
);

/**
 * A highlight must mostly reuse the person's own words (by 5-letter stem), so
 * paraphrases pass but invented achievements don't.
 */
export function isHighlightGrounded(highlight: string, source: string): boolean {
  const stems = new Set(tokens(source).map((t) => t.slice(0, 5)));
  const words = tokens(highlight).filter((t) => t.length >= 4 && !STOPWORDS.has(t));
  if (words.length === 0) return false;
  const hits = words.filter((w) => stems.has(w.slice(0, 5))).length;
  return hits / words.length >= 0.5;
}

/** Drop extracted entities that the source text doesn't support. */
export function groundExtraction(x: Extraction, source: string): Extraction {
  const dates = <T extends { startDate?: string; endDate?: string }>(e: T): T => ({
    ...e,
    startDate: groundDate(e.startDate, source),
    endDate: groundDate(e.endDate, source),
  });
  return {
    ...x,
    experience: x.experience
      ?.filter((e) => (e.company ? isGrounded(e.company, source) : Boolean(e.role)))
      .map((e) => ({ ...dates(e), highlights: e.highlights?.filter((h) => isHighlightGrounded(h, source)) })),
    education: x.education?.filter((e) => isInstitutionGrounded(e.institution, source)).map(dates),
    projects: x.projects?.filter((p) => isGrounded(p.name, source)),
    certifications: x.certifications?.filter((c) => isGrounded(c.name, source)),
    languages: x.languages?.filter((l) => isLanguageGrounded(l.language, source)),
    skills: x.skills?.filter((s) => isGrounded(s, source)),
  };
}

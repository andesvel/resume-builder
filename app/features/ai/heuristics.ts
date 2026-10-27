import type { Extraction } from "./extraction-schema";

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const URL = /\b(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:\/[^\s,;)]*)?/gi;
const PHONE = /(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,4}\d{2,4}/g;

const YEAR_RANGE = /^(19|20)\d{2}\s*[-–.\s]\s*(19|20)\d{2}$/;

const KNOWN_SITES: [RegExp, string][] = [
  [/linkedin\.com/i, "LinkedIn"],
  [/github\.com/i, "GitHub"],
  [/gitlab\.com/i, "GitLab"],
  [/(twitter|x)\.com/i, "X"],
  [/behance\.net/i, "Behance"],
  [/dribbble\.com/i, "Dribbble"],
  [/medium\.com/i, "Medium"],
  [/stackoverflow\.com/i, "Stack Overflow"],
];

export function labelForUrl(url: string): string {
  return KNOWN_SITES.find(([re]) => re.test(url))?.[1] ?? "Website";
}

const NAME_CUE =
  /\b(?:me llamo|mi nombre es|my name is|i am|i'm)\s+([A-Za-zÁÉÍÓÚÑÜáéíóúñü][A-Za-zÁÉÍÓÚÑÜáéíóúñü'-]+(?:\s+(?!y\b|and\b|soy\b|de\b)[A-Za-zÁÉÍÓÚÑÜáéíóúñü][A-Za-zÁÉÍÓÚÑÜáéíóúñü'-]+){0,3})/i;

const capitalizeWord = (w: string) => w.charAt(0).toLocaleUpperCase() + w.slice(1);

/** "me llamo andres velez, soy…" -> "Andres Velez". Only with an explicit cue, never guessed. */
export function extractName(text: string): string | undefined {
  const words = text.match(NAME_CUE)?.[1]?.split(/\s+/);
  // "I'm a developer" is not a name.
  if (!words || /^(a|an|un|una)$/i.test(words[0] ?? "")) return undefined;
  return words.map(capitalizeWord).join(" ");
}

/**
 * Deterministic extraction for things regexes do better than a small model:
 * emails, URLs and phone numbers are copied verbatim, never "corrected".
 */
export function extractContacts(text: string): Pick<Extraction, "name" | "email" | "phone" | "links"> {
  const emails = text.match(EMAIL) ?? [];
  const withoutEmails = emails.reduce((t, e) => t.replace(e, " "), text);
  const urls = [...new Set(withoutEmails.match(URL) ?? [])].filter((u) => /[/.]/.test(u) && !/^\d+(\.\d+)+$/.test(u));
  const phone = (withoutEmails.match(PHONE) ?? []).map((p) => p.trim()).find((p) => p.replace(/\D/g, "").length >= 7 && !YEAR_RANGE.test(p));

  return {
    name: extractName(text),
    email: emails[0],
    phone,
    links: urls.length ? urls.map((url) => ({ label: labelForUrl(url), url: url.replace(/[.,]$/, "") })) : undefined,
  };
}

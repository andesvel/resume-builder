import type { Locale } from "~/i18n/config";
import { getT } from "~/i18n";

/** "2020-03" -> "Mar 2020" / "mar 2020"; "2020" -> "2020"; "" -> "". */
export function formatPartialDate(value: string, locale: Locale): string {
  const [year, month] = value.split("-");
  if (!year) return "";
  if (!month) return year;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  const name = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(date).replace(".", "");
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
}

export function formatDateRange(start: string, end: string, locale: Locale, current = false): string {
  const from = formatPartialDate(start, locale);
  const to = current ? getT(locale)("editor.present") : formatPartialDate(end, locale);
  if (from && to) return `${from} – ${to}`;
  return from || to;
}

/** Display form of a URL: no protocol, no trailing slash. */
export function displayUrl(url: string): string {
  return url.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
}

/** Absolute URL for links; leaves mailto/tel alone. */
export function hrefFor(url: string): string {
  const trimmed = url.trim();
  if (!trimmed || /^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export const nonEmpty = (lines: string[]) => lines.map((l) => l.trim()).filter(Boolean);

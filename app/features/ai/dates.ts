/** Month names (and common abbreviations) in English and Spanish. */
const MONTHS: Record<string, number> = {};
const names = [
  ["january", "jan", "enero", "ene"],
  ["february", "feb", "febrero"],
  ["march", "mar", "marzo"],
  ["april", "apr", "abril", "abr"],
  ["may", "mayo"],
  ["june", "jun", "junio"],
  ["july", "jul", "julio"],
  ["august", "aug", "agosto", "ago"],
  ["september", "sep", "sept", "septiembre", "setiembre", "set"],
  ["october", "oct", "octubre"],
  ["november", "nov", "noviembre"],
  ["december", "dec", "diciembre", "dic"],
];
names.forEach((aliases, i) => aliases.forEach((a) => (MONTHS[a] = i + 1)));

const PRESENT = /^(present|current|now|today|actual(idad|mente)?|presente|hoy|la fecha)$/i;

export interface NormalizedDate {
  date: string;
  current: boolean;
}

/**
 * Turn whatever a model or a person wrote ("Mar 2020", "03/2020", "marzo de 2020",
 * "2020", "present") into the schema's partial-date format.
 */
export function normalizeDate(input: string | undefined): NormalizedDate {
  const value = (input ?? "").trim().toLowerCase().replace(/\.$/, "");
  if (!value) return { date: "", current: false };
  if (PRESENT.test(value)) return { date: "", current: true };

  let m = value.match(/^(\d{4})[-/.](\d{1,2})(?:[-/.]\d{1,2})?$/);
  if (m) return month(m[1], m[2]);
  m = value.match(/^(\d{1,2})[-/.](\d{4})$/);
  if (m) return month(m[2], m[1]);
  m = value.match(/^([a-záéíóú]+)\.?\s*(?:de\s+|del\s+)?(\d{4})$/);
  if (m && m[1] && MONTHS[m[1]]) return month(m[2], String(MONTHS[m[1]]));
  m = value.match(/\b(19|20)\d{2}\b/);
  if (m) return { date: m[0], current: false };
  return { date: "", current: false };
}

function month(year: string | undefined, mon: string | undefined): NormalizedDate {
  const n = Number(mon);
  if (!year || !(n >= 1 && n <= 12)) return { date: year ?? "", current: false };
  return { date: `${year}-${String(n).padStart(2, "0")}`, current: false };
}

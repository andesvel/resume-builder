import type { TFunction } from "~/i18n";

import type { MergeSummary } from "./merge";

const FIELD_KEYS = {
  name: "fields.name",
  headline: "fields.headline",
  email: "fields.email",
  phone: "fields.phone",
  location: "fields.location",
  summary: "fields.summary",
} as const;

/** One-line, localized description of what a merge changed, for the toast. */
export function describeSummary(summary: MergeSummary, t: TFunction): string {
  const lower = (s: string) => s.toLowerCase();
  const parts: string[] = [];
  const fields = summary.updatedFields.map((f) => lower(t(FIELD_KEYS[f as keyof typeof FIELD_KEYS] ?? "fields.name")));
  if (fields.length) parts.push(t("assistant.updatedFields", { fields: fields.join(", ") }));

  const items = (counts: Partial<Record<string, number>>) =>
    Object.entries(counts)
      .map(([key, n]) => `${n} ${lower(key === "links" ? t("fields.links") : t(`sections.${key as "experience"}`))}`)
      .join(", ");
  if (Object.keys(summary.added).length) parts.push(t("assistant.addedItems", { items: items(summary.added) }));
  if (Object.keys(summary.updated).length) parts.push(t("assistant.updatedItems", { items: items(summary.updated) }));
  return parts.join(" · ");
}

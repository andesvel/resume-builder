import type { TemplateId } from "./schema";

/** PDF fonts. Helvetica and Times are PDF built-ins; the rest are embedded (SIL OFL). */
export const fontIds = ["helvetica", "times", "inter", "ibm-plex-sans", "source-sans-3", "eb-garamond", "lora", "source-serif-4"] as const;
export type FontId = (typeof fontIds)[number];

export const fontMeta: Record<FontId, { label: string; category: "sans" | "serif" }> = {
  helvetica: { label: "Helvetica", category: "sans" },
  inter: { label: "Inter", category: "sans" },
  "ibm-plex-sans": { label: "IBM Plex Sans", category: "sans" },
  "source-sans-3": { label: "Source Sans 3", category: "sans" },
  times: { label: "Times", category: "serif" },
  "eb-garamond": { label: "EB Garamond", category: "serif" },
  lora: { label: "Lora", category: "serif" },
  "source-serif-4": { label: "Source Serif 4", category: "serif" },
};

export const defaultFonts: Record<TemplateId, FontId> = {
  professional: "helvetica",
  modern: "helvetica",
  minimal: "times",
};

export function fontFor(resume: { template: TemplateId; fonts: Partial<Record<TemplateId, FontId>> }): FontId {
  return resume.fonts[resume.template] ?? defaultFonts[resume.template];
}

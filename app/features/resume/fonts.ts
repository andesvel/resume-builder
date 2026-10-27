import type { TemplateId } from "./schema";

/** PDF fonts. Helvetica and Times are PDF built-ins; the rest are embedded (SIL OFL). */
export const fontIds = ["helvetica", "times", "inter", "ibm-plex-sans", "source-sans-3", "eb-garamond", "lora", "source-serif-4"] as const;
export type FontId = (typeof fontIds)[number];

/** `css` is the CSS font stack used to preview the font in the UI. */
export const fontMeta: Record<FontId, { label: string; category: "sans" | "serif"; css: string }> = {
  helvetica: { label: "Helvetica", category: "sans", css: "Helvetica, Arial, sans-serif" },
  inter: { label: "Inter", category: "sans", css: "'Inter', sans-serif" },
  "ibm-plex-sans": { label: "IBM Plex Sans", category: "sans", css: "'IBM Plex Sans', sans-serif" },
  "source-sans-3": { label: "Source Sans 3", category: "sans", css: "'Source Sans 3', sans-serif" },
  times: { label: "Times", category: "serif", css: "'Times New Roman', Times, serif" },
  "eb-garamond": { label: "EB Garamond", category: "serif", css: "'EB Garamond', serif" },
  lora: { label: "Lora", category: "serif", css: "'Lora', serif" },
  "source-serif-4": { label: "Source Serif 4", category: "serif", css: "'Source Serif 4', serif" },
};

export const defaultFonts: Record<TemplateId, FontId> = {
  professional: "helvetica",
  modern: "helvetica",
  minimal: "times",
};

export function fontFor(resume: { template: TemplateId; fonts: Partial<Record<TemplateId, FontId>> }): FontId {
  return resume.fonts[resume.template] ?? defaultFonts[resume.template];
}

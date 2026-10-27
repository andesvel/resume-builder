/**
 * Light sidebar tints for the Modern template (Tailwind's 100 shades). Only
 * light tones are offered so black text always stays readable and ATS-safe.
 */
export const sidebarTones = {
  neutral: "#f5f5f5",
  stone: "#f5f5f4",
  sky: "#e0f2fe",
  blue: "#dbeafe",
  emerald: "#d1fae5",
  amber: "#fef3c7",
  rose: "#ffe4e6",
  violet: "#ede9fe",
} as const;

export const toneIds = Object.keys(sidebarTones) as [keyof typeof sidebarTones, ...(keyof typeof sidebarTones)[]];
export type ToneId = keyof typeof sidebarTones;

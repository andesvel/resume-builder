import { z } from "zod";

import { locales } from "~/i18n/config";

import { fontIds } from "./fonts";
import { phoneRegionIds } from "./phone";
import { toneIds } from "./tones";

/**
 * Single source of truth for resume data. Every field has a default so that
 * partial input (older saves, imports, AI extraction) parses into a complete,
 * renderable resume.
 */

const id = () => z.string().default(() => crypto.randomUUID());
const text = () => z.string().default("");
const list = <T extends z.ZodType>(item: T) => z.array(item).default([]);

/** "YYYY-MM", "YYYY" or "" when unknown. */
export const partialDate = z
  .string()
  .regex(/^(\d{4}(-(0[1-9]|1[0-2]))?)?$/, "Expected YYYY or YYYY-MM")
  .default("");

export const templateIds = ["professional", "modern", "minimal"] as const;
export type TemplateId = (typeof templateIds)[number];

export const sectionKeys = [
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "languages",
  "custom",
] as const;
export type SectionKey = (typeof sectionKeys)[number];

export const linkSchema = z.object({ id: id(), label: text(), url: text() });

export const basicsSchema = z.object({
  name: text(),
  headline: text(),
  email: text(),
  phone: text(),
  location: text(),
  summary: text(),
  links: list(linkSchema),
});

export const experienceSchema = z.object({
  id: id(),
  company: text(),
  role: text(),
  location: text(),
  startDate: partialDate,
  endDate: partialDate,
  current: z.boolean().default(false),
  highlights: list(z.string()),
});

export const educationSchema = z.object({
  id: id(),
  institution: text(),
  degree: text(),
  field: text(),
  startDate: partialDate,
  endDate: partialDate,
  /** Still studying there; shown as "Present" instead of an end date. */
  current: z.boolean().default(false),
  gpa: text(),
  honors: text(),
});

export const skillGroupSchema = z.object({ id: id(), name: text(), keywords: list(z.string()) });

export const projectSchema = z.object({
  id: id(),
  name: text(),
  url: text(),
  description: text(),
  highlights: list(z.string()),
});

export const certificationSchema = z.object({
  id: id(),
  name: text(),
  issuer: text(),
  date: partialDate,
  url: text(),
});

export const languageSchema = z.object({ id: id(), language: text(), fluency: text() });

export const customEntrySchema = z.object({
  id: id(),
  title: text(),
  subtitle: text(),
  date: text(),
  highlights: list(z.string()),
});

export const customSectionSchema = z.object({ id: id(), title: text(), entries: list(customEntrySchema) });

export const coverLetterSchema = z.object({
  recipient: text(),
  company: text(),
  role: text(),
  jobDescription: text(),
  body: text(),
});

export const whatsappSources = ["phone", "number", "username"] as const;
export type WhatsappSource = (typeof whatsappSources)[number];

export const qrKinds = ["vcard", "whatsapp", "url", "email", "phone"] as const;
export type QrKind = (typeof qrKinds)[number];

/** Optional QR code printed on the resume so a reader can act on a paper copy. */
export const qrSchema = z.object({
  enabled: z.boolean().default(false),
  /** vCard saves a contact; the others open a WhatsApp chat, a link, an email or a call. */
  kind: z.enum(qrKinds).catch("vcard").default("vcard"),
  /** Link (from basics.links) encoded when kind is "url"; the first one when empty or gone. */
  linkId: text(),
  /** Subject prefilled when kind is "email". */
  subject: text(),
  /** Surname(s) for the vCard, when guessing them from the full name gets it wrong. */
  familyName: text(),
  /** Region (e.g. "MX") whose calling code completes a WhatsApp number written without one. */
  phoneRegion: z.enum(phoneRegionIds).optional().catch(undefined),
  /** WhatsApp the "whatsapp" kind opens: the resume's phone, another number or a username. */
  whatsapp: z.enum(whatsappSources).catch("phone").default("phone"),
  whatsappNumber: text(),
  /** Without the "@". */
  whatsappUsername: text(),
  /** Message prefilled when kind is "whatsapp". */
  whatsappMessage: text(),
});

export const RESUME_SCHEMA_VERSION = 1;

export const resumeSchema = z.object({
  schemaVersion: z.literal(RESUME_SCHEMA_VERSION).default(RESUME_SCHEMA_VERSION),
  id: id(),
  title: z.string().default("Untitled resume"),
  /** Language the resume content is written in (drives section headings). */
  locale: z.enum(locales).default("en"),
  template: z.enum(templateIds).default("professional"),
  /** Font chosen per template; templates without an entry use their default. */
  fonts: z.partialRecord(z.enum(templateIds), z.enum(fontIds)).default({}),
  /** Sidebar tint of the Modern template. */
  // Unknown tones (e.g. the retired "stone") fall back to gray instead of invalidating the resume.
  sidebarTone: z.enum(toneIds).catch("neutral").default("neutral"),
  sectionOrder: z.array(z.enum(sectionKeys)).default([...sectionKeys]),
  hiddenSections: list(z.enum(sectionKeys)),
  basics: basicsSchema.default(() => basicsSchema.parse({})),
  experience: list(experienceSchema),
  education: list(educationSchema),
  skills: list(skillGroupSchema),
  projects: list(projectSchema),
  certifications: list(certificationSchema),
  languages: list(languageSchema),
  custom: list(customSectionSchema),
  coverLetter: coverLetterSchema.default(() => coverLetterSchema.parse({})),
  qr: qrSchema.default(() => qrSchema.parse({})),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type Resume = z.infer<typeof resumeSchema>;
export type ResumeInput = z.input<typeof resumeSchema>;
export type Basics = z.infer<typeof basicsSchema>;
export type Link = z.infer<typeof linkSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Education = z.infer<typeof educationSchema>;
export type SkillGroup = z.infer<typeof skillGroupSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Certification = z.infer<typeof certificationSchema>;
export type Language = z.infer<typeof languageSchema>;
export type CustomSection = z.infer<typeof customSectionSchema>;
export type CustomEntry = z.infer<typeof customEntrySchema>;
export type CoverLetter = z.infer<typeof coverLetterSchema>;
export type QrSettings = z.infer<typeof qrSchema>;

export type ResumeMeta = Pick<Resume, "id" | "title" | "template" | "locale" | "updatedAt" | "createdAt"> & {
  name: string;
};

export function toMeta(resume: Resume): ResumeMeta {
  const { id, title, template, locale, updatedAt, createdAt } = resume;
  return { id, title, template, locale, updatedAt, createdAt, name: resume.basics.name };
}

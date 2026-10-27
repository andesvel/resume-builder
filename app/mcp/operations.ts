import { z } from "zod";

import { cloneResume } from "~/features/resume/factory";
import {
  basicsSchema,
  certificationSchema,
  coverLetterSchema,
  customSectionSchema,
  educationSchema,
  experienceSchema,
  languageSchema,
  linkSchema,
  projectSchema,
  type Resume,
  resumeSchema,
  sectionKeys,
  skillGroupSchema,
  templateIds,
} from "~/features/resume/schema";
import { fontIds } from "~/features/resume/fonts";
import { toneIds } from "~/features/resume/tones";
import { locales } from "~/i18n/config";

/**
 * Editing operations shared by the MCP tools. Each takes a resume and returns
 * a new, fully validated one, so an agent can never store invalid data.
 */

export const entrySchemas = {
  links: linkSchema,
  experience: experienceSchema,
  education: educationSchema,
  skills: skillGroupSchema,
  projects: projectSchema,
  certifications: certificationSchema,
  languages: languageSchema,
  custom: customSectionSchema,
} as const;

export type EntrySection = keyof typeof entrySchemas;
export const entrySections = Object.keys(entrySchemas) as [EntrySection, ...EntrySection[]];

type Entry = { id: string };

function list(resume: Resume, section: EntrySection): Entry[] {
  return section === "links" ? resume.basics.links : resume[section];
}

function withList(resume: Resume, section: EntrySection, items: Entry[]): Resume {
  const next = structuredClone(resume);
  if (section === "links") next.basics.links = items as Resume["basics"]["links"];
  else (next[section] as Entry[]) = items;
  return finalize(next);
}

function finalize(resume: Resume): Resume {
  return resumeSchema.parse({ ...resume, updatedAt: new Date().toISOString() });
}

function findIndex(items: Entry[], entryId: string, section: string): number {
  const index = items.findIndex((e) => e.id === entryId);
  if (index === -1) throw new Error(`No entry with id "${entryId}" in ${section}. Use get_resume to see entry ids.`);
  return index;
}

/** Partial resume accepted by create/update. Arrays replace the whole section; `basics` is merged. */
export const resumeChangesSchema = z
  .object({
    title: z.string(),
    locale: z.enum(locales),
    template: z.enum(templateIds),
    fonts: z.partialRecord(z.enum(templateIds), z.enum(fontIds)),
    sidebarTone: z.enum(toneIds),
    sectionOrder: z.array(z.enum(sectionKeys)),
    hiddenSections: z.array(z.enum(sectionKeys)),
    basics: basicsSchema.partial(),
    experience: z.array(experienceSchema.partial()),
    education: z.array(educationSchema.partial()),
    skills: z.array(skillGroupSchema.partial()),
    projects: z.array(projectSchema.partial()),
    certifications: z.array(certificationSchema.partial()),
    languages: z.array(languageSchema.partial()),
    custom: z.array(customSectionSchema.partial()),
    coverLetter: coverLetterSchema.partial(),
  })
  .partial();

export type ResumeChanges = z.infer<typeof resumeChangesSchema>;

export function applyChanges(resume: Resume, changes: ResumeChanges): Resume {
  const { basics, coverLetter, fonts, ...rest } = changes;
  return finalize({
    ...resume,
    ...(rest as Partial<Resume>),
    basics: { ...resume.basics, ...(basics as Partial<Resume["basics"]>) },
    coverLetter: { ...resume.coverLetter, ...coverLetter },
    fonts: { ...resume.fonts, ...fonts },
  });
}

export function createFromChanges(changes: ResumeChanges): Resume {
  return applyChanges(resumeSchema.parse({ title: changes.basics?.name || "Untitled resume" }), changes);
}

export function addEntry(resume: Resume, section: EntrySection, entry: unknown, position?: number): { resume: Resume; entryId: string } {
  const parsed = entrySchemas[section].parse(entry ?? {}) as Entry;
  const items = [...list(resume, section)];
  items.splice(position ?? items.length, 0, parsed);
  return { resume: withList(resume, section, items), entryId: parsed.id };
}

export function updateEntry(resume: Resume, section: EntrySection, entryId: string, changes: Record<string, unknown>): Resume {
  const items = [...list(resume, section)];
  const index = findIndex(items, entryId, section);
  items[index] = entrySchemas[section].parse({ ...items[index], ...changes, id: entryId }) as Entry;
  return withList(resume, section, items);
}

export function removeEntry(resume: Resume, section: EntrySection, entryId: string): Resume {
  const items = list(resume, section);
  findIndex(items, entryId, section);
  return withList(resume, section, items.filter((e) => e.id !== entryId));
}

export function moveEntry(resume: Resume, section: EntrySection, entryId: string, position: number): Resume {
  const items = [...list(resume, section)];
  const [item] = items.splice(findIndex(items, entryId, section), 1);
  items.splice(Math.max(0, Math.min(position, items.length)), 0, item as Entry);
  return withList(resume, section, items);
}

export function duplicate(resume: Resume): Resume {
  return cloneResume(resume, { title: `${resume.title} (2)` });
}

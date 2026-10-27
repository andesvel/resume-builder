import { produce } from "immer";

import type { Locale } from "~/i18n/config";
import { getT } from "~/i18n";
import { displayUrl } from "~/features/resume/format";
import {
  certificationSchema,
  educationSchema,
  experienceSchema,
  languageSchema,
  linkSchema,
  projectSchema,
  type Resume,
  skillGroupSchema,
} from "~/features/resume/schema";

import { normalizeDate } from "./dates";
import type { Extraction } from "./extraction-schema";

/** Accent-, case- and punctuation-insensitive key for matching entries across inputs. */
export function matchKey(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|s\.?a\.?s?|corp|co)\b\.?/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function sameEntity(a: string | undefined, b: string | undefined): boolean {
  const ka = matchKey(a);
  const kb = matchKey(b);
  return ka.length > 0 && kb.length > 0 && (ka === kb || ka.includes(kb) || kb.includes(ka));
}

const clean = (v: string | undefined) => v?.trim() ?? "";

/** Assign only when the incoming value is non-empty, so a later input can correct but never blank a field. */
function assign<T extends object, K extends keyof T>(target: T, key: K, value: T[K] | undefined, changed: () => void) {
  if (typeof value === "string" && value.trim() === "") return;
  if (value === undefined || target[key] === value) return;
  target[key] = value;
  changed();
}

function appendUnique(target: string[], incoming: string[] | undefined): number {
  let added = 0;
  for (const item of incoming ?? []) {
    const text = item.trim();
    if (text && !target.some((t) => matchKey(t) === matchKey(text))) {
      target.push(text);
      added++;
    }
  }
  return added;
}

export interface MergeSummary {
  updatedFields: string[];
  added: Partial<Record<"experience" | "education" | "skills" | "languages" | "projects" | "certifications" | "links", number>>;
  updated: Partial<Record<"experience" | "education", number>>;
}

export function isEmptySummary(summary: MergeSummary) {
  return summary.updatedFields.length === 0 && Object.keys(summary.added).length === 0 && Object.keys(summary.updated).length === 0;
}

/**
 * Fold what was extracted from one free-text input into the resume. Matching is
 * by company / institution / name, so a follow-up like "at Acme I also led X"
 * enriches the existing entry instead of duplicating it.
 */
export function mergeExtraction(resume: Resume, x: Extraction): { resume: Resume; summary: MergeSummary } {
  const summary: MergeSummary = { updatedFields: [], added: {}, updated: {} };
  const bump = (bucket: "added" | "updated", key: string, n = 1) => {
    if (n <= 0) return;
    const map = summary[bucket] as Record<string, number>;
    map[key] = (map[key] ?? 0) + n;
  };

  const next = produce(resume, (d) => {
    for (const key of ["name", "headline", "email", "phone", "location", "summary"] as const) {
      assign(d.basics, key, clean(x[key]), () => summary.updatedFields.push(key));
    }

    for (const link of x.links ?? []) {
      const url = clean(link.url);
      if (!url) continue;
      const label = clean(link.label);
      const existing = d.basics.links.find(
        (l) => displayUrl(l.url).toLowerCase() === displayUrl(url).toLowerCase() || (label && matchKey(l.label) === matchKey(label)),
      );
      if (existing) {
        existing.url = url;
        if (label) existing.label = label;
      } else {
        d.basics.links.push(linkSchema.parse({ label, url }));
        bump("added", "links");
      }
    }

    for (const e of x.experience ?? []) {
      if (!clean(e.company) && !clean(e.role)) continue;
      const start = normalizeDate(e.startDate);
      const end = normalizeDate(e.endDate);
      const current = e.current === true || end.current;
      const existing = d.experience.find((it) =>
        clean(e.company) ? sameEntity(it.company, e.company) : sameEntity(it.role, e.role) && !it.company,
      );
      const target = existing ?? experienceSchema.parse({});
      let touched = false;
      const mark = () => void (touched = true);
      assign(target, "company", clean(e.company), mark);
      assign(target, "role", clean(e.role), mark);
      assign(target, "location", clean(e.location), mark);
      assign(target, "startDate", start.date, mark);
      if (current) {
        assign(target, "current", true, mark);
        assign(target, "endDate", "", mark);
      } else if (end.date) {
        assign(target, "endDate", end.date, mark);
        assign(target, "current", false, mark);
      }
      if (appendUnique(target.highlights, e.highlights) > 0) touched = true;
      if (!existing) {
        d.experience.push(target);
        bump("added", "experience");
      } else if (touched) bump("updated", "experience");
    }

    for (const e of x.education ?? []) {
      if (!clean(e.institution) && !clean(e.degree)) continue;
      const existing = d.education.find((it) => sameEntity(it.institution, e.institution));
      const target = existing ?? educationSchema.parse({});
      let touched = false;
      const mark = () => void (touched = true);
      assign(target, "institution", clean(e.institution), mark);
      assign(target, "degree", clean(e.degree), mark);
      assign(target, "field", clean(e.field), mark);
      assign(target, "startDate", normalizeDate(e.startDate).date, mark);
      assign(target, "endDate", normalizeDate(e.endDate).date, mark);
      if (!existing) {
        d.education.push(target);
        bump("added", "education");
      } else if (touched) bump("updated", "education");
    }

    const skills = (x.skills ?? []).map((s) => s.trim()).filter(Boolean);
    if (skills.length) {
      const known = new Set(d.skills.flatMap((g) => g.keywords.map(matchKey)));
      const fresh: string[] = [];
      for (const skill of skills) {
        const key = matchKey(skill);
        if (known.has(key)) continue;
        known.add(key);
        fresh.push(skill);
      }
      if (fresh.length) {
        let group = d.skills[0];
        if (!group) {
          group = skillGroupSchema.parse({ name: getT(d.locale as Locale)("sections.skills") });
          d.skills.push(group);
        }
        group.keywords.push(...fresh);
        bump("added", "skills", fresh.length);
      }
    }

    for (const l of x.languages ?? []) {
      if (!clean(l.language)) continue;
      const existing = d.languages.find((it) => sameEntity(it.language, l.language));
      if (existing) assign(existing, "fluency", clean(l.fluency), () => {});
      else {
        d.languages.push(languageSchema.parse({ language: clean(l.language), fluency: clean(l.fluency) }));
        bump("added", "languages");
      }
    }

    for (const p of x.projects ?? []) {
      if (!clean(p.name)) continue;
      const existing = d.projects.find((it) => sameEntity(it.name, p.name));
      const target = existing ?? projectSchema.parse({});
      assign(target, "name", clean(p.name), () => {});
      assign(target, "url", clean(p.url), () => {});
      assign(target, "description", clean(p.description), () => {});
      if (!existing) {
        d.projects.push(target);
        bump("added", "projects");
      }
    }

    for (const c of x.certifications ?? []) {
      if (!clean(c.name)) continue;
      const existing = d.certifications.find((it) => sameEntity(it.name, c.name));
      const target = existing ?? certificationSchema.parse({});
      assign(target, "name", clean(c.name), () => {});
      assign(target, "issuer", clean(c.issuer), () => {});
      assign(target, "date", normalizeDate(c.date).date, () => {});
      if (!existing) {
        d.certifications.push(target);
        bump("added", "certifications");
      }
    }
  });

  return { resume: next, summary };
}

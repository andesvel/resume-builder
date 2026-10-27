import { unzipSync, strFromU8 } from "fflate";

import type { Locale } from "~/i18n/config";
import { getT } from "~/i18n";
import { normalizeDate } from "~/features/ai/dates";
import { labelForUrl } from "~/features/ai/heuristics";
import { createResume } from "~/features/resume/factory";
import type { Resume, ResumeInput } from "~/features/resume/schema";

import { parseCsvRecords } from "./csv";

/** Find a CSV in the export regardless of folder or exact casing ("Positions.csv", "Basic_LinkedInDataExport/…"). */
function csv(files: Record<string, Uint8Array>, name: string): Record<string, string>[] {
  const key = Object.keys(files).find((k) => k.split("/").pop()?.toLowerCase() === name.toLowerCase());
  return key ? parseCsvRecords(strFromU8(files[key] as Uint8Array)) : [];
}

const lines = (text: string | undefined) =>
  (text ?? "")
    .split(/\r?\n|•/)
    .map((l) => l.replace(/^\s*[-*]\s*/, "").trim())
    .filter(Boolean);

/** LinkedIn lists websites as "[PORTFOLIO:https://…,OTHER:https://…]". */
function parseWebsites(value: string | undefined) {
  return (value ?? "")
    .replace(/^\[|\]$/g, "")
    .split(/,(?=[A-Z]+:)/)
    .map((part) => part.replace(/^[A-Z]+:/, "").trim())
    .filter(Boolean)
    .map((url) => ({ label: labelForUrl(url), url }));
}

export function isLinkedInExport(files: Record<string, Uint8Array>): boolean {
  return Object.keys(files).some((k) => /(^|\/)(profile|positions)\.csv$/i.test(k));
}

/**
 * Deterministic import of LinkedIn's "Download your data" archive. No AI
 * needed: the export is already structured.
 */
export function resumeFromLinkedInZip(zip: Uint8Array, locale: Locale): Resume | null {
  const files = unzipSync(zip, { filter: (f) => f.name.toLowerCase().endsWith(".csv") });
  if (!isLinkedInExport(files)) return null;
  const t = getT(locale);

  const profile = csv(files, "Profile.csv")[0] ?? {};
  const email = csv(files, "Email Addresses.csv").find((e) => e["Primary"] === "Yes") ?? csv(files, "Email Addresses.csv")[0];
  const phone = csv(files, "PhoneNumbers.csv")[0];
  const name = [profile["First Name"], profile["Last Name"]].filter(Boolean).join(" ");

  const input: ResumeInput = {
    title: name ? `${name} – LinkedIn` : "LinkedIn",
    locale,
    basics: {
      name,
      headline: profile["Headline"] ?? "",
      location: profile["Geo Location"] ?? "",
      summary: profile["Summary"] ?? "",
      email: email?.["Email Address"] ?? "",
      phone: phone?.["Number"] ?? "",
      links: parseWebsites(profile["Websites"]),
    },
    experience: csv(files, "Positions.csv").map((p) => {
      const end = normalizeDate(p["Finished On"]);
      return {
        company: p["Company Name"],
        role: p["Title"],
        location: p["Location"],
        startDate: normalizeDate(p["Started On"]).date,
        endDate: end.date,
        current: !p["Finished On"],
        highlights: lines(p["Description"]),
      };
    }),
    education: csv(files, "Education.csv").map((e) => ({
      institution: e["School Name"],
      degree: e["Degree Name"],
      startDate: normalizeDate(e["Start Date"]).date,
      endDate: normalizeDate(e["End Date"]).date,
      honors: e["Activities"],
    })),
    skills: (() => {
      const keywords = csv(files, "Skills.csv").map((s) => s["Name"] ?? "").filter(Boolean);
      return keywords.length ? [{ name: t("sections.skills"), keywords }] : [];
    })(),
    languages: csv(files, "Languages.csv").map((l) => ({ language: l["Name"], fluency: l["Proficiency"] })),
    certifications: csv(files, "Certifications.csv").map((c) => ({
      name: c["Name"],
      issuer: c["Authority"],
      date: normalizeDate(c["Started On"]).date,
      url: c["Url"],
    })),
    projects: csv(files, "Projects.csv").map((p) => ({
      name: p["Title"],
      url: p["Url"],
      description: p["Description"],
    })),
  };
  return createResume(input);
}

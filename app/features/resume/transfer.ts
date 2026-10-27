import { downloadBlob, slugify } from "~/lib/download";

import { cloneResume, parseResume } from "./factory";
import type { Resume } from "./schema";

export function exportResumeJson(resume: Resume) {
  const blob = new Blob([JSON.stringify(resume, null, 2)], { type: "application/json" });
  downloadBlob(blob, `${slugify(resume.basics.name || resume.title)}.json`);
}

/** Parse an exported resume; the copy gets a fresh id so it never overwrites an existing one. */
export async function importResumeJson(file: File): Promise<Resume | null> {
  try {
    const parsed = parseResume(JSON.parse(await file.text()));
    return parsed && cloneResume(parsed);
  } catch {
    return null;
  }
}

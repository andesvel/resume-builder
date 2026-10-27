import { createStore, del, get, set, values } from "idb-keyval";

import { parseResume } from "./factory";
import { type Resume, type ResumeMeta, toMeta } from "./schema";

/**
 * Persistence boundary. The app only talks to this interface, so moving from
 * browser storage to a synced backend (e.g. D1 behind auth) means adding a new
 * implementation, not touching the UI.
 */
export interface ResumeRepository {
  list(): Promise<ResumeMeta[]>;
  get(id: string): Promise<Resume | null>;
  save(resume: Resume): Promise<void>;
  delete(id: string): Promise<void>;
}

export class IndexedDbResumeRepository implements ResumeRepository {
  private store = createStore("resume-builder", "resumes");

  async list() {
    const all = await values(this.store);
    return all
      .map(parseResume)
      .filter((r): r is Resume => r !== null)
      .map(toMeta)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(id: string) {
    return parseResume(await get(id, this.store));
  }

  async save(resume: Resume) {
    await set(resume.id, resume, this.store);
  }

  async delete(id: string) {
    await del(id, this.store);
  }
}

let repository: ResumeRepository | undefined;

export function getResumeRepository(): ResumeRepository {
  repository ??= new IndexedDbResumeRepository();
  return repository;
}

import { DurableObject } from "cloudflare:workers";

import { parseResume } from "~/features/resume/factory";
import { type Resume, type ResumeMeta, toMeta } from "~/features/resume/schema";

/** Drafts live a week after their last change; the import link is meant to be used soon. */
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Server-side home for resumes edited by agents over MCP. The browser stays
 * the source of truth: a draft reaches the app through its import link.
 * One instance holds every draft (personal scale); per-user instances come
 * with auth.
 */
export class DraftStore extends DurableObject<Env> {
  private sql = this.ctx.storage.sql;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    )`);
  }

  async get(id: string): Promise<Resume | null> {
    const row = this.sql.exec<{ data: string }>("SELECT data FROM drafts WHERE id = ? AND expires_at > ?", id, Date.now()).toArray()[0];
    return row ? parseResume(JSON.parse(row.data)) : null;
  }

  async put(resume: Resume): Promise<void> {
    const expires = Date.now() + TTL_MS;
    this.sql.exec(
      "INSERT INTO drafts (id, data, expires_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, expires_at = excluded.expires_at",
      resume.id,
      JSON.stringify(resume),
      expires,
    );
    if ((await this.ctx.storage.getAlarm()) === null) await this.ctx.storage.setAlarm(expires);
  }

  async delete(id: string): Promise<boolean> {
    return this.sql.exec("DELETE FROM drafts WHERE id = ?", id).rowsWritten > 0;
  }

  async list(): Promise<ResumeMeta[]> {
    return this.sql
      .exec<{ data: string }>("SELECT data FROM drafts WHERE expires_at > ?", Date.now())
      .toArray()
      .map((row) => parseResume(JSON.parse(row.data)))
      .filter((r): r is Resume => r !== null)
      .map(toMeta)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  /** Sweep expired drafts and schedule the next sweep. */
  async alarm(): Promise<void> {
    this.sql.exec("DELETE FROM drafts WHERE expires_at <= ?", Date.now());
    const next = this.sql.exec<{ next: number | null }>("SELECT MIN(expires_at) AS next FROM drafts").toArray()[0]?.next;
    if (next) await this.ctx.storage.setAlarm(next);
  }
}

export function draftStore(env: Env) {
  return env.DRAFTS.get(env.DRAFTS.idFromName("drafts"));
}

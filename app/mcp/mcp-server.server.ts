import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { fontIds, fontMeta, defaultFonts } from "~/features/resume/fonts";
import { parseResume } from "~/features/resume/factory";
import type { Resume } from "~/features/resume/schema";
import { sectionKeys, templateIds } from "~/features/resume/schema";
import { toneIds } from "~/features/resume/tones";
import { resumeFromLinkedInZip } from "~/features/import/linkedin";
import { locales } from "~/i18n/config";

import { draftStore } from "./draft-store.server";
import {
  addEntry,
  applyChanges,
  createFromChanges,
  duplicate,
  entrySections,
  moveEntry,
  removeEntry,
  resumeChangesSchema,
  updateEntry,
} from "./operations";
import { renderPdf } from "./render-pdf.server";

const INSTRUCTIONS = `Resume Builder: create and edit resumes and cover letters, then hand them to the user.
- Resumes live here as drafts for 7 days after their last change. The user saves one into the app by opening its import link (get_import_link); nothing reaches their browser otherwise.
- Use only facts the user gave you. Ask for missing ones instead of inventing them.
- Dates are "YYYY" or "YYYY-MM"; set current: true for an ongoing job or degree instead of an end date. Education "field" is the subject studied, never a status.
- Write content in the resume's locale ("en" or "es").
- Call describe_options for templates, fonts, colors and section names.`;

const idArg = { id: z.string().describe("Resume id (from create_resume or list_resumes)") };
const sectionArg = z.enum(entrySections).describe('Section holding entries. "links" are the contact links in basics.');

function json(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function failure(error: unknown) {
  const message =
    error instanceof z.ZodError
      ? `Invalid data: ${error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ")}`
      : error instanceof Error
        ? error.message
        : String(error);
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

interface Context {
  env: Env;
  origin: string;
}

export function createMcpServer({ env, origin }: Context): McpServer {
  const server = new McpServer({ name: "resume-builder", version: "1.0.0" }, { instructions: INSTRUCTIONS });
  const store = draftStore(env);
  const links = (id: string) => ({
    importUrl: `${origin}/import/${id}`,
    resumePdfUrl: `${origin}/api/drafts/${id}/resume.pdf`,
    coverLetterPdfUrl: `${origin}/api/drafts/${id}/cover-letter.pdf`,
  });

  async function load(id: string): Promise<Resume> {
    const resume = await store.get(id);
    if (!resume) throw new Error(`Resume "${id}" not found (drafts expire 7 days after their last change).`);
    return resume;
  }

  /** Run an edit, save it, and answer with a short summary the agent can chain from. */
  function edit<A extends { id: string }>(fn: (resume: Resume, args: A) => Resume | { resume: Resume; entryId: string }) {
    return async (args: A) => {
      try {
        const result = fn(await load(args.id), args);
        const resume = "entryId" in result ? result.resume : result;
        await store.put(resume);
        return json({ ok: true, id: resume.id, ...("entryId" in result ? { entryId: result.entryId } : {}), updatedAt: resume.updatedAt });
      } catch (error) {
        return failure(error);
      }
    };
  }

  server.registerTool(
    "describe_options",
    { title: "Describe options", description: "Templates, fonts, sidebar colors, sections and locales accepted by the other tools.", annotations: { readOnlyHint: true } },
    async () =>
      json({
        locales,
        templates: templateIds,
        defaultFontPerTemplate: defaultFonts,
        fonts: fontIds.map((id) => ({ id, ...fontMeta[id] })),
        sidebarTones: { values: toneIds, note: "Only used by the modern template." },
        sectionOrder: sectionKeys,
        entrySections,
        dateFormat: "YYYY or YYYY-MM",
      }),
  );

  server.registerTool(
    "list_resumes",
    { title: "List resumes", description: "Drafts stored for MCP, newest first.", annotations: { readOnlyHint: true } },
    async () => json(await store.list()),
  );

  server.registerTool(
    "create_resume",
    {
      title: "Create resume",
      description:
        "Create a resume, optionally filled in one call. Every field is optional; missing ones get defaults. Returns its id and links.",
      inputSchema: { resume: resumeChangesSchema.optional().describe("Initial content (same shape as update_resume.changes)") },
    },
    async ({ resume }) => {
      try {
        const created = createFromChanges(resume ?? {});
        await store.put(created);
        return json({ id: created.id, ...links(created.id) });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "get_resume",
    { title: "Get resume", description: "Full resume JSON, including entry ids.", inputSchema: idArg, annotations: { readOnlyHint: true } },
    async ({ id }) => {
      try {
        return json(await load(id));
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "update_resume",
    {
      title: "Update resume",
      description:
        "Change any part of a resume. `basics`, `coverLetter` and `fonts` are merged; any section array you pass (experience, education, skills, …) replaces that whole section. For single entries prefer add_entry/update_entry.",
      inputSchema: { ...idArg, changes: resumeChangesSchema },
    },
    edit((resume, { changes }: { id: string; changes: z.infer<typeof resumeChangesSchema> }) => applyChanges(resume, changes)),
  );

  server.registerTool(
    "add_entry",
    {
      title: "Add entry",
      description: "Append (or insert at `position`) one entry to a section: a job, degree, skill group, project, certification, language, custom section or link.",
      inputSchema: { ...idArg, section: sectionArg, entry: z.record(z.string(), z.unknown()).describe("Entry fields, e.g. {company, role, startDate, current, highlights}"), position: z.number().int().min(0).optional() },
    },
    edit((resume, a: { id: string; section: (typeof entrySections)[number]; entry: Record<string, unknown>; position?: number }) =>
      addEntry(resume, a.section, a.entry, a.position),
    ),
  );

  server.registerTool(
    "update_entry",
    {
      title: "Update entry",
      description: "Change fields of one entry; fields you omit stay as they are.",
      inputSchema: { ...idArg, section: sectionArg, entryId: z.string(), changes: z.record(z.string(), z.unknown()) },
    },
    edit((resume, a: { id: string; section: (typeof entrySections)[number]; entryId: string; changes: Record<string, unknown> }) =>
      updateEntry(resume, a.section, a.entryId, a.changes),
    ),
  );

  server.registerTool(
    "remove_entry",
    { title: "Remove entry", description: "Delete one entry from a section.", inputSchema: { ...idArg, section: sectionArg, entryId: z.string() }, annotations: { destructiveHint: true } },
    edit((resume, a: { id: string; section: (typeof entrySections)[number]; entryId: string }) => removeEntry(resume, a.section, a.entryId)),
  );

  server.registerTool(
    "move_entry",
    { title: "Move entry", description: "Move an entry to a 0-based position within its section.", inputSchema: { ...idArg, section: sectionArg, entryId: z.string(), position: z.number().int().min(0) } },
    edit((resume, a: { id: string; section: (typeof entrySections)[number]; entryId: string; position: number }) =>
      moveEntry(resume, a.section, a.entryId, a.position),
    ),
  );

  server.registerTool(
    "duplicate_resume",
    { title: "Duplicate resume", description: "Copy a resume under a new id (e.g. to tailor it for another job).", inputSchema: idArg },
    async ({ id }) => {
      try {
        const copy = duplicate(await load(id));
        await store.put(copy);
        return json({ id: copy.id, ...links(copy.id) });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "delete_resume",
    { title: "Delete resume", description: "Delete a draft from the server (copies already imported in the app are not affected).", inputSchema: idArg, annotations: { destructiveHint: true } },
    async ({ id }) => json({ deleted: await store.delete(id) }),
  );

  server.registerTool(
    "import_resume_json",
    { title: "Import JSON", description: "Create a resume from a JSON export of the app (the content of the .json file).", inputSchema: { json: z.string() } },
    async ({ json: text }) => {
      try {
        const parsed = parseResume(JSON.parse(text));
        if (!parsed) throw new Error("That JSON is not a Resume Builder export.");
        const copy = duplicate(parsed);
        copy.title = parsed.title;
        await store.put(copy);
        return json({ id: copy.id, ...links(copy.id) });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "import_linkedin_export",
    {
      title: "Import LinkedIn export",
      description: "Create a resume from LinkedIn's \"Get a copy of your data\" archive (.zip), passed as base64.",
      inputSchema: { zipBase64: z.string(), locale: z.enum(locales).default("en") },
    },
    async ({ zipBase64, locale }) => {
      try {
        const bytes = Uint8Array.from(atob(zipBase64), (c) => c.charCodeAt(0));
        const resume = resumeFromLinkedInZip(bytes, locale);
        if (!resume) throw new Error("That zip doesn't look like a LinkedIn data export.");
        await store.put(resume);
        return json({ id: resume.id, ...links(resume.id) });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "export_json",
    { title: "Export JSON", description: "The resume as the app's JSON backup format.", inputSchema: idArg, annotations: { readOnlyHint: true } },
    async ({ id }) => {
      try {
        return json(await load(id));
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "export_pdf",
    {
      title: "Export PDF",
      description:
        "Render the resume or cover letter as PDF with its template, font and colors. Returns the file and a download URL (no auth needed; it contains the unguessable id) that you can save with e.g. curl -o.",
      inputSchema: { ...idArg, document: z.enum(["resume", "cover_letter"]).default("resume") },
      annotations: { readOnlyHint: true },
    },
    async ({ id, document }) => {
      try {
        const resume = await load(id);
        const bytes = await renderPdf(env, origin, resume, document);
        let binary = "";
        for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        const url = document === "resume" ? links(id).resumePdfUrl : links(id).coverLetterPdfUrl;
        return {
          content: [
            { type: "text" as const, text: `PDF ready (${Math.round(bytes.length / 1024)} KB). Download: ${url}` },
            { type: "resource" as const, resource: { uri: url, mimeType: "application/pdf", blob: btoa(binary) } },
          ],
        };
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "get_import_link",
    {
      title: "Get import link",
      description: "Link the user opens in their browser to save the resume into the app (where it can be edited and exported).",
      inputSchema: idArg,
      annotations: { readOnlyHint: true },
    },
    async ({ id }) => {
      try {
        await load(id);
        return json(links(id));
      } catch (error) {
        return failure(error);
      }
    },
  );

  return server;
}

import { REPO_URL } from "~/lib/seo";

import type { Route } from "./+types/llms";

/** A plain-text overview for LLMs and AI assistants (https://llmstxt.org). */
export function loader({ request }: Route.LoaderArgs) {
  const origin = new URL(request.url).origin;
  const body = `# Resume Builder

> Free, local-first resume builder with public source code. People describe their experience in plain words and get a structured, ATS-friendly resume and cover letter as PDF. The AI runs in the browser (Chrome's built-in Gemini Nano, or open models via WebLLM on WebGPU); resumes are stored only in the user's browser. Available in English and Spanish.

## What it does

- Natural-language input: one text box; each submission is extracted by an on-device model and merged into the resume, so people can keep writing to add or correct facts.
- Editor for every section (personal info, summary, experience, education, skills, projects, certifications, languages, custom sections), with undo/redo and autosave.
- Three PDF templates (Professional, Modern, Minimal) with real, selectable text, standard section names and no hyphenation, so applicant tracking systems parse them. Eight embedded fonts; light sidebar colors for Modern.
- Imports: PDF or Word resume (read by the local AI after review), LinkedIn data export (.zip), JSON backup.
- Cover letter editor with an on-device AI draft and matching PDF.
- No account and no upload: data stays in the browser.

## For AI agents (MCP)

The site is also a Model Context Protocol server at ${origin}/mcp (streamable HTTP, bearer token required by the deployment). Agents such as Claude Code, Codex or OpenCode can create resumes, edit any field, add/move/remove entries, change template, font and colors, write the cover letter, import JSON or LinkedIn exports, and export JSON or PDF. Drafts live on the server for 7 days; the user saves one into the browser through its import link.

- [Connecting an agent](${origin}/agents): setup for Claude Code, Codex and OpenCode, tool list, privacy.

## Links

- [Home](${origin}/)
- [Source code](${REPO_URL}): React Router 8 on Cloudflare Workers.
- [README](${REPO_URL}#readme)
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}

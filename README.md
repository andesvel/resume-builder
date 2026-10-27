# resume-builder

Local-first resume builder. Write who you are in plain language and get a structured, ATS-friendly resume and cover letter. The AI runs **in your browser**, with no API keys or servers, and your data never leaves the device.

## Features

- **Natural-language input.** It's one textbox, not a chat: describe yourself and press Enter, and the resume fills in. Keep writing to add facts or correct them (e.g. "I actually left Acme in March 2023").
- **Local AI.** It uses Chrome's built-in Prompt API (Gemini Nano) when available, and otherwise falls back to [WebLLM](https://github.com/mlc-ai/web-llm) (Qwen3 1.7B / 0.6B on WebGPU, in a Web Worker). The first use asks before downloading a model.
- **Editor.** There are forms for every section, with reorderable and hideable sections, reorderable entries, undo/redo and autosave.
- **Templates.** Professional, Modern and Minimal templates produce text-based PDFs that ATS can parse. The live preview is the exact exported PDF.
- **Import** from a PDF or Word resume (read by the local AI after you review the text), a LinkedIn data export (.zip, parsed without AI) or a JSON backup.
- **Cover letter.** You write it or draft it with the local AI from your resume. It exports to a PDF that matches the resume.
- **i18n.** The UI is in English and Spanish, and each resume has its own content language for headings and dates.
- **Light/dark theme** in a monochrome style, with Tailwind colors for status only.

## Use it from an AI agent (MCP)

The Worker exposes a [Model Context Protocol](https://modelcontextprotocol.io) server at `/mcp`. It lets an agent such as Claude Code, Codex or OpenCode do everything the UI does: create a resume, fill or edit any field, add, move or remove entries, change the template, font or sidebar color, write the cover letter, import a JSON or LinkedIn export, and export JSON or PDF. The agent does the writing itself; the small local model is not involved.

- **Auth.** The endpoint requires `Authorization: Bearer <MCP_TOKEN>` and refuses every request when the secret isn't set.
- **Where data lives.** Agent-made resumes are stored as server-side drafts (a SQLite Durable Object) and expire 7 days after their last change. They reach your browser only when you open the draft's **import link** (`/import/<id>`).
- **Capability URLs.** Import links and PDF links (`/api/drafts/<id>/resume.pdf`) need no token; the random id is the access. Share them accordingly.

Set the token (once per environment):

```bash
openssl rand -base64 32
```

```bash
pnpm wrangler secret put MCP_TOKEN
```

For local development, put `MCP_TOKEN=<value>` in `.dev.vars`.

Connect your agent (replace the URL and token):

```bash
claude mcp add --transport http resume-builder https://resume-builder.<subdomain>.workers.dev/mcp --header "Authorization: Bearer $RESUME_BUILDER_TOKEN"
```

- **Codex** (`~/.codex/config.toml`):

  ```toml
  [mcp_servers.resume-builder]
  url = "https://resume-builder.<subdomain>.workers.dev/mcp"
  bearer_token_env_var = "RESUME_BUILDER_TOKEN"
  ```

- **OpenCode** (`opencode.json`):

  ```json
  { "mcp": { "resume-builder": { "type": "remote", "url": "https://resume-builder.<subdomain>.workers.dev/mcp", "headers": { "Authorization": "Bearer {env:RESUME_BUILDER_TOKEN}" } } } }
  ```

Then ask, for example: "Create my resume with this info…, use the minimal template with EB Garamond and download the PDF."

## How the AI part stays reliable with small models

On-device models are small, so the model only does what it is good at. The rest is deterministic code in `app/features/ai/`:

1. **Focused passes.** Each section (profile, experience, education, skills, extras) is a separate, JSON-schema-constrained request. A pass is skipped when the text has no cues for it.
2. **Regex for contacts.** Emails, phones and URLs are copied verbatim.
3. **Grounding.** Companies, schools, skills, highlights and dates must be supported by the user's text; invented ones are dropped. Months are taken from the text itself.
4. **Polish.** Languages, levels and common skill names are canonicalized, and job titles are removed from skills.
5. **Merge.** Entries are matched by company, school or name, so follow-ups enrich existing entries instead of duplicating them. A field is never blanked. Profile fields and job titles are only replaced when the text is clearly about them.

> [runonweb](https://runonweb.ai) was evaluated. It has no general text-generation module yet, so extraction uses the Prompt API and WebLLM. Its OCR and translation modules are on the [roadmap](ROADMAP.md).

## Stack

| | |
|---|---|
| Framework | React Router 8 (framework mode, SSR) |
| Runtime | Cloudflare Workers (static assets + SSR), `@cloudflare/vite-plugin` |
| UI | shadcn/ui (Radix), Tailwind CSS v4, lucide icons |
| State / data | Zustand + Immer, Zod schema, IndexedDB (`idb-keyval`) |
| PDF | `@react-pdf/renderer` (export), `pdf.js` (preview, import) |
| AI | Chrome Prompt API, `@mlc-ai/web-llm` |
| Tests | Vitest |

## Architecture

```
app/
  routes/            home (resume list), editor (?view=letter), locale action
  features/
    resume/          schema (single source of truth), factory, repository, store, format
    editor/          section forms and primitives
    pdf/             templates, preview, renderers (client-only)
    ai/              engines, extraction passes, grounding, polish, merge, assistant UI
    import/          PDF/Word text, LinkedIn zip, CSV
    cover-letter/    draft prompt and editor
  i18n/              typed en/es dictionaries
  mcp/               MCP tools, editing operations, draft store (Durable Object), server-side PDF
workers/app.ts       Worker entry: /mcp, draft PDFs, then React Router
```

- **Persistence is swappable.** The UI only uses `ResumeRepository`. Today that is IndexedDB. Supporting accounts means adding an implementation backed by D1 behind auth, with no UI changes.
- **Heavy code stays client-only.** react-pdf, pdf.js and WebLLM live behind `.client` modules, so the Worker bundle stays at about 1.4 MB.

## Development

Requires Node 24 and pnpm (version pinned in `package.json` → `packageManager`).

```bash
pnpm install
```

```bash
pnpm dev
```

| Script | |
|---|---|
| `pnpm dev` | Dev server (workerd via the Cloudflare plugin) |
| `pnpm typecheck` | Route typegen + `tsc -b` |
| `pnpm test` | Unit tests |
| `pnpm build` | Production build |
| `pnpm deploy` | Build and `wrangler deploy` |
| `pnpm cf-typegen` | Regenerate `worker-configuration.d.ts` after changing `wrangler.jsonc` |

### Dependency policy

- Every version is pinned exactly (`save-exact`). Upgrades are explicit edits.
- `minimumReleaseAge: 10080`: pnpm only installs versions published at least 7 days ago.
- Lifecycle scripts only run for an allowlist (`onlyBuiltDependencies`).
- GitHub Actions are pinned to commit SHAs.

## Workflow

- `main` is production and only receives PRs from `dev`.
- `dev` is the integration branch and receives PRs from `<type>/<topic>` branches (`feat/…`, `fix/…`, `docs/…`, `ci/…`, …).
- Commits are atomic and follow Conventional Commits.

CI (`.github/workflows/ci.yml`) runs on every PR to `dev` or `main`: a branch-flow guard, typecheck, tests and build. Pushing to `main` deploys to Workers (`deploy.yml`), which needs the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets.

Branch protection is defined in `.github/rulesets/protect-main-dev.json`. GitHub only enforces it on private repos with a paid plan. Apply it once the repo is public or on Pro:

```bash
gh api -X POST repos/andesvel/resume-builder/rulesets --input .github/rulesets/protect-main-dev.json
```

## License

[MIT](LICENSE)

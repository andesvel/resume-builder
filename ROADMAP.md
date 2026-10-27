# Roadmap

Ideas parked after the MVP. Check items off as they land.

## v2

- [ ] **Translate a resume to the other language** (en ↔ es) with the same local model, or with runonweb's `translate` (Firefox Translations, ~22–37 MB), into a linked copy
- [ ] **DOCX export** (and DOCX template parity with the PDF templates)
- [ ] **ATS check**: keyword coverage, section detection, plain-text preview of what a parser sees
- [ ] **Job match / tailoring**: paste a job description, then see missing keywords and create a tailored copy linked to the master resume
- [ ] **OCR for scanned PDFs** with runonweb's `ocr` (PP-OCRv6, ~31 MB)
- [ ] Re-run extraction over an imported PDF/Word file section by section, with a diff to accept or reject changes

## MCP / agents

- [ ] **Live pairing**: the app shows a code and an agent edits the open resume in real time (Durable Object + WebSocket), with no import link
- [ ] **Local stdio MCP** (`npx resume-builder-mcp`) that works offline and writes a `.json` to import
- [ ] Server-side PDF export in `pnpm dev` (today it needs a build: `pnpm preview`)
- [ ] Per-user tokens / OAuth once accounts exist; drafts scoped per user
- [ ] "Send to agent" from the editor (needs auth so the upload endpoint isn't open)

## Product / scale

- [ ] **Accounts** (e.g. Better Auth) + **D1** `ResumeRepository` so users can keep several versions in sync across devices; IndexedDB stays as the offline cache
- [ ] Share link / public read-only resume page
- [ ] Custom domain: `resume-builder.andesvel.dev` (Workers custom domain once `andesvel.dev` is bought)
- [ ] Open-source release: CONTRIBUTING, issue templates (license done: MIT)
- [ ] Enforce the branch ruleset (`.github/rulesets/`) once public or on GitHub Pro

## SEO

- [ ] Open Graph / social image (1200×630) and favicons once the logo exists
- [ ] Locale in the URL (e.g. `/es`) with `hreflang`, so the Spanish pages get indexed too (today the language comes from a cookie or Accept-Language on the same URL, so crawlers see English)
- [x] Add a LICENSE (MIT)

## Editor & templates

- [ ] Drag-and-drop reordering (sections and entries)
- [ ] More templates; accent color option (still ATS-safe)
- [ ] Embedded fonts (Inter/Geist) in PDFs instead of the standard 14
- [ ] Rich text (bold/links) in highlights
- [ ] Photo option for regions where it's customary

## AI quality

- [ ] Evaluate Qwen3 4B, Qwen3.5 4B/9B and Qwen3 8B on the extraction set (they need more browser storage than our test pane allowed) and add them to the recommendation order if they beat Gemma 4 E2B
- [ ] Per-pass few-shot examples tuned on real inputs; a small offline eval set
- [ ] Support removing things in natural language ("remove the Acme job")
- [ ] Rewrite a highlight on request (action verbs, metrics prompts), never adding facts

## Engineering

- [ ] E2E tests (Playwright) for create → assistant → export
- [ ] PWA / offline install
- [ ] Lint + format in CI (Biome)
- [ ] Renovate with the same pinning/age policy

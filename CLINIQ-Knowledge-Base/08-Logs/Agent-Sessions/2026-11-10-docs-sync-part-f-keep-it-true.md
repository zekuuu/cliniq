# 2026-11-10 — Docs sync Part F: keep it true, the GitHub front page

Date/Day/Time: Tuesday, November 10, 2026 — 17:28 PHT
Agent: Claude Opus 5.5 (Claude Code), docs-only run.
Branch: `main` at `8f70297`, uncommitted.
Task: Part F of the pre-SRS / Project Plan documentation sync.
Status: Completed

Prompt/Request: Zean, Tuesday, November 10, 2026 (chat): one command the team can run to catch drift; a maintenance table; an ADR index and a "what changed since Project Plan 2.8" page; the GitHub front page (`.gitignore`, CONTRIBUTING, a pull request template, suggested About text); a privacy sweep; Obsidian and GitHub both; paste-friendly tables and images.

Files Modified:
- `04-Development/tools/docs-check.mjs` (written in Part A; now also reads untracked files and skips `backend/README.md` on `main`), `docs-facts.mjs` (reads the backend through git when the tree has none), `docs-adr-index.mjs` (new); root `package.json` scripts `docs:facts`, `docs:check`, `docs:trace`, `docs:diagrams`, `docs:adrs`.
- `06-Decisions/ADR-Index.md` (generated, 79 rows), `06-Decisions/Changes-Since-Project-Plan-2.8.md` (new, by area, each line with its ADR).
- `Frontend-Loop-Engineering.md` and `Backend-Loop-Engineering.md`: one Definition-of-done line each ("run the docs check; fix what it flags in the READMEs you touched").
- `CONTRIBUTING.md`, `.github/pull_request_template.md` (new); `.gitignore` adds `*.dump`, `*.sql.gz`, `*.zip`, `.cliniq/` (no tracked file matched).
- Start Here carries the maintenance table.

Privacy sweep: every new or changed document, diagram and screenshot read for names, LRNs, birthdates, phone numbers, addresses, passwords, tokens and `.env` values. Team members and the school appear only where existing documents already named them. The screenshots replace the demo accounts' personal names in the rendered page (see Part B; the seed itself is a `FIX`). `.env` and `.env.example` were never read. Only `backend/.env.example` and `frontend/.env.example` are tracked, as before.

Obsidian: no file or folder renamed; every new link is a relative Markdown link, which Obsidian and GitHub both resolve; `.obsidian/` untouched.

Testing Performed: `npm run docs:check -- --mermaid` all pass (see Part E). `npm run docs:adrs` writes 79 rows; one row (ADR-006) has no one-line effect because its summary heading does not match the pattern.

Not done, by the prompt's rule: no CI workflow or automation was added. Suggested GitHub About text is in the hand-back for Zean to set by hand.

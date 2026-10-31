# Session: Backend preparation: the operating manual, ADR-056 and two prompts

**Date/Day/Time:** Saturday, October 31, 2026 — 18:20 PHT
**Agent:** Claude (Sonnet 5.5), working in the Claude chat/cloud workspace on a clone of `main` at `b830cee`
**Task:** Prepare for backend development: write the backend operating manual, record the decisions, and write the prompts that check the documents against the code and then prepare the backend on its own branch.
**Status:** Completed (documents, records and prompts only; no code changed; nothing committed or pushed; the new and edited files are delivered as a zip, and the prompts as separate files)

## Prompt/Request
Zean, Saturday, October 31, 2026 — 18:10 PHT: prepare for backend development, the interfaces for it, backend loop engineering, then the ERD and the database, and add the implicit requests he might have forgotten; build the backend on a different branch called `backend`, touching only the backend side, with no frontend integration and no connecting yet, "just preparing the API, the middleware, the CORS, etc."; but first make sure the documentation and the knowledge base (the `.md` files) are accurate with what the system actually has.

His answers to Claude's three questions: the ERD is **reviewed first, with no migrations yet**; the first round is the **foundation only**; auth is **Sanctum SPA cookie mode**.

## Files Modified
- `06-Decisions/ADR-056-Backend-Preparation-Sanctum-SPA-Cookie-Mode-Own-Branch-Nothing-Wired-No-Migrations-Before-ERD-Approval.md` (new)
- `06-Decisions/Decisions-Summary.md` (ADR-056 entry)
- `04-Development/Backend-Loop-Engineering.md` (new)
- `04-Development/Development-Phases.md` (a pointer to the manual under the intro, a sentence on B0, and the Sanctum mode wording in B2)
- `04-Development/Backend-Readiness-Checklist.md` (the "Sanctum mode" item ticked, with ADR-056)
- `04-Development/Frontend-Loop-Engineering.md` (one sentence: the backend equivalent now exists)
- `AGENTS.md` and `CLAUDE.md` (one sentence at the end of step 4, kept identical in both)
- `08-Logs/Issues-and-TODOs.md` (a pointer to the backend file and one `DOC`), `08-Logs/Changelog.md` (a pointer and one row)
- `08-Logs/Backend-Issues-and-TODOs.md` and `08-Logs/Backend-Changelog.md` (new: the backend's own logs, Zean, 18:24 PHT, so the `backend` branch and `main` never conflict)
- Prompts, outside the repository: `Prompt-Audit-Documentation-Against-Code-Oct31.md`, `Prompt-Backend-Preparation-Oct31.md`
- Not touched: `backend/`, `frontend/`, the canonical documents, `ERD.md`, `Data-Dictionary.md`, `Reference-Schema.sql`, the other READMEs, the Privacy Policy.

## Changes Made
What the repository holds today (checked first): `backend/` has only a README and `.env.example` (SPA-cookie settings already in it); the phases B0 to B10 exist in `Development-Phases.md`; the Backend Readiness Checklist lists the blockers; `Frontend-Loop-Engineering.md` said there was no backend equivalent; the mock API now exports about 100 functions in about 3,000 lines (the readiness checklist still says 64 and about 1,500, which the documentation pass is asked to correct); no CI workflow exists.

What was decided (ADR-056): Sanctum SPA cookie mode; a branch named `backend`; backend side only; nothing wired to the frontend and the mock data layer kept untouched (Zean, 18:36 PHT); foundation only in the first round; no migrations, seeders or models with columns before the ERD is approved.

What was written:
1. **`Backend-Loop-Engineering.md`**, the counterpart of the frontend manual: the six ground rules, Phase 0 (read), Phase 1 (build, test first), Phase 2 (countercheck against the mock API, audit, simulate, confirm), deterministic checks, "integration is not part of this loop", and a resumable checklist (P1 to P3, B0.1 to B0.10, then B1 to B10 waiting for the ERD).
2. **`Prompt-Audit-Documentation-Against-Code-Oct31.md`**: a resumable documentation accuracy pass on a branch `docs/accuracy-pass`, area by area, with a facts inventory built from the code first, a table saying who wins when a document and the code disagree, a "do not edit, list only" set (canonical documents, ERD files, history) and deterministic checks (link checker, stale-term search, number checks).
3. **`Prompt-Backend-Preparation-Oct31.md`**: three parts on the branch `backend`: Part 1 prepare (environment pinned, API contract, ERD review with an approval checklist), Part 2 foundation (scaffold, modular folders, configuration, CORS, Sanctum SPA, middleware, error envelope, audit contract, shared helpers, health route, route surface test, documents), Part 3 countercheck and audit. Fifteen stated defaults (D1 to D15) the agent shows before starting.
4. **Logs:** the backend has its own `Backend-Issues-and-TODOs.md` (a NOTE, 1 `FIX`, 1 `LATER`; FIX 1 · LATER 1 · NOTE 1) and `Backend-Changelog.md`. The main Issues file got a pointer line and a section "Documentation accuracy pass" with 1 `DOC`; the main Changelog got a pointer and one row.

## Reason
Zean wants the backend to start from accurate records, on its own branch, without touching or connecting the frontend, and without guessing a database design the team has not approved. The mock API is the executable spec for the backend, so the contract and the rules to port are written from it before any code.

## Testing Performed
- Every scripted replacement asserted that its old text occurred exactly once.
- Counted the main Issues file with the project's counting rule: FIX 23, AUDIT 10, DOC 25, DECIDE 3, LATER 28, NOTE 77, VERIFY 25 (only the DOC is new); counted the backend file the same way: FIX 1, LATER 1, NOTE 1; the archive was not changed (Done 389 still matches).
- Relative links in the new and edited documents were checked to resolve inside the repository layout.

## Known Issues
- The audit prompt and this session both edit `Backend-Readiness-Checklist.md` (this session ticked one line; the audit refreshes its numbers). They touch different lines; apply this zip first, then run the audit.
- No CI is added (the repository has no workflows); an OpenAPI file and a CI workflow are open choices for later.
- The LAN HTTPS decision, the backup plan with the client, the real seed data and the registrar import format are still open (see the readiness checklist); the foundation does not depend on them, except HSTS, which is left out until HTTPS is decided.

## Next Steps
1. Apply the v25 zip, then run the documentation accuracy prompt and merge `docs/accuracy-pass`.
2. Run `Prompt-Backend-Preparation-Oct31.md` Part 1 on the branch `backend`; review `ERD-Review.md` and its approval checklist with the team.
3. Part 2 (foundation) and Part 3 (audit); migrations and the module APIs after the ERD approval.

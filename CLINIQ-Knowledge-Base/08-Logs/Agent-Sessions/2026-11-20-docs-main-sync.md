Date/Day/Time: Friday, November 20, 2026 — 02:00 PHT (started 01:52 PHT; clock read with PowerShell `Get-Date`)
Agent: Claude Code (Opus 5.5)
Task: Bring `main`'s documents, READMEs, diagrams, screenshots index and numbers up to date with the code on `main` (documentation only)
Status: Completed

## Prompt/Request

Zean pasted the reusable prompt "Bring `main`'s documents, READMEs, diagrams, screenshots index and numbers up to date with the code now on `main`". Its main rules:
- Documentation only, on `main`.
- No commit, no push and no branch.
- Allowed paths only.
- No database commands; `.env` is not opened.
- Numbers come from `docs:facts` and are checked by hand.
- Add a groupmate digest in Start-Here, a `Main-Sync-<date>/NOTES.md` and a `Main-Sync-Log.md` row.

**Pop-up answer.** The tree held the uncommitted Frequent-visitor pager work of the same night. Zean chose "Sync on top, exclude".

## Files Modified

- **READMEs:** `README.md`, `README_ORIGINAL.md`, `CLINIQ-Knowledge-Base/README.md`, `backend/README.md`, and `frontend/README.md` (its "Last checked" line only).
- **Start-Here and Facts:** `CLINIQ-Knowledge-Base/00-Project-Core/Start-Here-For-SRS-And-Project-Plan.md`; `Facts-Sheet.md` (regenerated, newer runs added by hand).
- **Architecture:** `02-Architecture/System-Architecture.md`, `Deployment-Diagram.md` (the text, not the diagram), `Tech-Stack.md`.
- **Development and testing:** `04-Development/Backend-Readiness-Checklist.md`, `Development-Phases.md`, `05-Testing/Test-Cases.md`.
- **Generated:** `06-Decisions/ADR-Index.md` and the traceability table in `01-Requirements/Functional-Requirements.md`. The ADR index changed only its date. The traceability table now counts the emergency-contact verify routes: `/api/students` 12 to 13 endpoints, `/api/personnel` 10 to 11.
- **Tool:** `04-Development/tools/docs-facts.mjs`.
- **Logs:** `08-Logs/Main-Sync-2026-11-20/NOTES.md` (new), `08-Logs/Main-Sync-Log.md`, `08-Logs/Frontend-Changelog.md`, this log.

## Changes Made

- **Root README.**
  - A "Last synced" line at the top.
  - The per-branch table is replaced by a "Where things live" folder table, plus one sentence for the kept branches and the tag.
  - 127 routes is now 131, and 231 tests is now 251.
  - `git switch backend` is gone from the backend commands.
  - One line on the server paging (ADR-082), the toasts (ADR-083) and the emergency-contact check.
- **Start-Here.** The same folder table, and a new digest, "Changes since the last sync (Wednesday, November 18, 2026)". The digest lists the ADRs, the numbers before and after, the features, the renamed terms (none) and the Plan or SRS statements that are now wrong.
- **Stale counts.** The numbers in README_ORIGINAL, the Knowledge Base README, the backend README and the readiness checklist are fixed.
- **Branch-era lines.** The lines that still placed the backend on its own branch are fixed: System-Architecture and Deployment-Diagram.
- **Tech-Stack.** The data-fetching row now names TanStack Query.
- **Dated updates.** Development-Phases and Test-Cases get dated updates.
- **`docs-facts.mjs`.** It reads only the working tree (ADR-081). Before, it took each side from the newest remote branch that held its folder, so a newer `feat/*` branch would have been counted instead of `main`. It also adds `@tanstack/react-query` and `sonner` to the stack table.

## Reason

The groupmate reads only GitHub's `main`. Several pages still described the pre-merge branches and the counts of November 16–18.

## Testing Performed

- `npm run docs:facts`, `docs:adrs` (83) and `docs:trace` (0 missing) ran. `docs:check` passes all checks.
- Three numbers were checked by hand: 131 routes, 48 tables and 47 frontend routes.
- The screenshot index matches: 34 of 34.
- Every `COMMANDS.md` script exists.
- The issue counts equal their header.
- No database command was run; `.env` was not opened; nothing was committed.

## Known Issues

The pager files from the earlier session are uncommitted and outside this run's allowed paths; they are listed in NOTES. The frontend line count, 70710, includes their 10 lines.

## Next Steps

Zean reviews, commits and pushes.

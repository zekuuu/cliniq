Date/Day/Time: Sunday, November 22, 2026 — 00:41 to 00:56 PHT (PowerShell `Get-Date`)
Agent: Claude Code (Opus 5.5)
Task: Docs sync of `main` at `b9fd646` (the reusable "Bring `main`'s documents … up to date" prompt)
Status: Completed (two canonical pointer lines left for Zean)
Prompt/Request: Zean pasted the reusable main-sync prompt: documentation only, directly on `main`, no commit; make what `main` says equal what `main` is since the last `Main-Sync-Log.md` row; write the groupmate digest in Start Here; regenerate the Facts sheet without `--tests`; check links, numbers and screenshots; never touch a database; ask in the pop-up before adding lines to the canonical documents.
Files Modified: `README.md`, `README_ORIGINAL.md`, `COMMANDS.md`, `backend/README.md`, `frontend/README.md`, `screenshots/INDEX.md`, `CLINIQ-Knowledge-Base/README.md`, `00-Project-Core/Start-Here-For-SRS-And-Project-Plan.md`, `00-Project-Core/Facts-Sheet.md`, `01-Requirements/Features/Module-Overview.md`, `01-Requirements/Functional-Requirements.md` (generated), `04-Development/API-Contract.md`, `04-Development/Backend-Readiness-Checklist.md`, `04-Development/Development-Phases.md`, `06-Decisions/ADR-Index.md` (generated), `09-References/Canonical-Documents/CLINIQ_Frontend_Context_Brief.md`, `08-Logs/Frontend-Issues-and-TODOs.md`, `08-Logs/Issues-Done-Archive.md`, `08-Logs/Frontend-Changelog.md`, `08-Logs/Main-Sync-Log.md`, new `08-Logs/Main-Sync-2026-11-22/NOTES.md`, this file.
Changes Made:
- Covered 23 commits since `533df61`: the ADR-084 bug fixes and the realistic five-year demo school.
- README Last synced and Last checked lines at `b9fd646`; ADR-084 in the README's current state; backend tests 251 to 255 (1,648 assertions) and the pre-existing Larastan failure stated in four pages; ADR count 83 to 84.
- "Below zero warns, never blocks" replaced by ADR-084's refusal in Module-Overview §8, Development-Phases and the API Contract (two places); screenshot 22's caption notes it predates ADR-084.
- `COMMANDS.md` seeder entry: five years to February 28, 2027, about 5.5 min.
- Start Here: new digest "Changes since the last sync (Friday, November 20, 2026)".
- Context Brief: three dated pointer lines (ADR-082, ADR-083/084, ADR-084), approved by Zean in the pop-up. DOC "the data layer" moved to the archive; ADR-083 and ADR-084 DOC entries stay open with a note. Frontend Issues counts recomputed (DOC 19, Done 519).
- Facts sheet regenerated (backend lines 17009); the newest runs (255 backend, 1278 frontend) added by hand from the November 21 session log; ADR index and traceability regenerated.
Reason: the groupmate reads only `main`; ADR-084 and the demo-school change had made several statements false.
Testing Performed: `npm run docs:check` all six pass; `docs:adrs` 84; `docs:trace` 0 missing; routes, tables and router checked by hand; screenshot INDEX 34 = 34 on disk; `git diff --name-status` all on the allowed list. No database touched.
Known Issues: Larastan `BackupService.php:171` still fails `composer check` (Backend FIX). Design Reference and Modules & Features pointer lines not approved yet. Screenshot 22 shows the old badge.
Next Steps: Zean reviews, commits and pushes. Details: [Main-Sync-2026-11-22/NOTES.md](../Main-Sync-2026-11-22/NOTES.md).

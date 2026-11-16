# Main sync — Tuesday, November 17, 2026

**Run:** Tuesday, November 17, 2026 — 05:46 PHT (clock: PowerShell `Get-Date`; `TZ=Asia/Manila date` prints UTC on this machine). Branch `docs/main-sync-2026-11-17`, created from `origin/main` at `dda26b2`. First run of the reusable prompt "Bring `main`'s documents, READMEs, diagrams and numbers up to date with the newest work on every branch" (Zean, Tuesday, November 17, 2026 — 05:28 PHT, chat). With no earlier row in [`Main-Sync-Log.md`](../Main-Sync-Log.md), "since" is the last docs refresh on `main`: `dda26b2`, Sunday, November 15, 2026 — 09:22 PHT.

Mid-run instruction from Zean (Tuesday, November 17, 2026, chat, about 05:38 PHT): "after that, use /komit then push already, then merge to main then push again". It overrides the prompt's "no commit, no push, no merge" for this run.

## Sources

`git fetch origin '+refs/heads/*:refs/remotes/origin/*' --prune`, then each remote branch's tip and `git rev-list --count origin/main..<branch>`.

| Branch | Tip | Date (PHT) | Ahead of `main` | Class |
|---|---|---|---|---|
| `feat/connect-frontend` | `759781e` | Tuesday, November 17, 2026 — 05:27 | 154 | **active**; contains `backend` and `main` (linear history) |
| `backend` | `18ff415` | Sunday, November 15, 2026 — 10:50 | 129 | active, fully contained in `feat/connect-frontend` |
| `feat/build-backend` | `3bcbe16` | Saturday, November 14, 2026 — 23:07 | 127 | active by date, fully contained in `backend` |
| `docs/sync-readmes` and 12 October and November 1 branches | various | October 1 to November 10, 2026 | 0 | stale: nothing that is not on `main` |

Because the history is linear (`main` ⊂ `feat/build-backend` ⊂ `backend` ⊂ `feat/connect-frontend`), the newest version of every allowed path is the one at `759781e`; no two active branches edit the same file differently, and no file was deleted or renamed on `main` after the source's change. No ADR number is created twice.

Working tree at the start: only `backend/storage/` untracked (Laravel cache, sessions and load-test SQL left from a backend checkout; ignored on the backend branches). Not touched, not committed.

## Drift table

Allowed paths only (`git diff --name-status origin/main 759781e`, filtered to the allowed list). Copy = `git checkout 759781e -- <path>`, byte-identical. Synthesise = copied, then rewritten for `main`.

| Path | `main` | Source | Action | Why |
|---|---|---|---|---|
| `AGENTS.md` | older | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLAUDE.md` | older | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/00-Project-Core/Facts-Sheet.md` | older | `feat/connect-frontend` `759781e` | synthesise | copied, then rewritten for `main` (links at a commit, present-tense state) |
| `CLINIQ-Knowledge-Base/00-Project-Core/Start-Here-For-SRS-And-Project-Plan.md` | older | `feat/connect-frontend` `759781e` | synthesise | copied, then rewritten for `main` (links at a commit, present-tense state) |
| `CLINIQ-Knowledge-Base/02-Architecture/Database/Diagrams/ERD-3.2-Students.png` | older | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/02-Architecture/Database/Diagrams/ERD-3.2-Students.svg` | older | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/02-Architecture/Database/Diagrams/ERD-3.5-Inventory.png` | older | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/02-Architecture/Database/Diagrams/ERD-3.5-Inventory.svg` | older | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/02-Architecture/Database/Diagrams/ERD-3.6-Access-and-Operations.png` | older | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/02-Architecture/Database/Diagrams/ERD-3.6-Access-and-Operations.svg` | older | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/02-Architecture/Database/ERD.md` | older | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/04-Development/API-Contract.md` | older | `feat/connect-frontend` `759781e` | synthesise | copied, then rewritten for `main` (links at a commit, present-tense state) |
| `CLINIQ-Knowledge-Base/04-Development/Development-Phases.md` | older | `feat/connect-frontend` `759781e` | synthesise | copied, then rewritten for `main` (links at a commit, present-tense state) |
| `CLINIQ-Knowledge-Base/04-Development/Environment-Setup.md` | older | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/05-Testing/Test-Strategy.md` | older | `feat/connect-frontend` `759781e` | synthesise | copied, then rewritten for `main` (links at a commit, present-tense state) |
| `CLINIQ-Knowledge-Base/06-Decisions/ADR-080-Frontend-Connects-To-The-API-Behind-A-Mode-Switch-Mock-Stays.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/06-Decisions/ADR-Index.md` | older | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-11-10-backend-b1-verify-b3-audit.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-11-10-backend-b2-signin-group1.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-11-11-backend-b2-signin-group2.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-11-11-backend-b4-archive-page-group4.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-11-11-backend-b4-imports-build-done.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-11-11-backend-b4-school-years-group3.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-11-11-backend-b4-staff-patients-group2.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-11-11-backend-b4-students-group1.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-11-13-backend-b10-users-backup-build.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-11-13-backend-b5-clinic-visits-build.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-11-13-backend-b7-emergency-response-build.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-11-13-backend-b8-inventory-build.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-11-13-backend-b9-dashboard-reports-build.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-11-13-backend-phase2-audit.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-11-14-backend-b1-migration-account-closed.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-11-14-backend-b1-seeder-and-open-items.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-11-14-backend-open-decisions-and-docs.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-11-15-backend-audit-log-data-envelope.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-11-15-frontend-connect-s0-mode-switch-and-client.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-11-15-frontend-connect-s1-sign-in-and-account.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-11-15-frontend-connect-s2-students-staff-school-years.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-11-15-frontend-connect-s3-clinic-visits.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-11-15-frontend-connect-s4-incidents.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-11-15-frontend-connect-s5-inventory.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-11-15-frontend-connect-s6-dashboard-and-reports.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-11-15-frontend-connect-s7-users-backup-audit-settings.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-11-15-frontend-connect-s8-whole-app-on-the-api.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-11-16-backend-followups-holiday-source-and-sex-split.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-11-16-followups-holidays-brief-sex-flaky-test.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-11-17-backend-load-generator-and-opening-ledger.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Backend-Changelog.md` | older | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Backend-Issues-and-TODOs.md` | older | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Connect-Frontend-Nov15/NOTES.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Connect-Frontend-Nov15/REPORT.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md` | older | `feat/connect-frontend` `759781e` | synthesise | copied, then this run's changelog row added on top (a one-row conflict at the merge) |
| `CLINIQ-Knowledge-Base/08-Logs/Frontend-Issues-and-TODOs.md` | older | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Issues-Done-Archive.md` | older | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/08-Logs/Load-Test-Nov16/NOTES.md` | absent | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/09-References/Canonical-Documents/CLINIQ_Frontend_Context_Brief.md` | older | `feat/connect-frontend` `759781e` | copy | newer on the source; byte-identical, merges cleanly later |
| `CLINIQ-Knowledge-Base/README.md` | older | `feat/connect-frontend` `759781e` | synthesise | copied, then rewritten for `main` (links at a commit, present-tense state) |
| `README.md` | older | `feat/connect-frontend` `759781e` | synthesise | copied, then rewritten for `main` (links at a commit, present-tense state) |
| `README_ORIGINAL.md` | older | `feat/connect-frontend` `759781e` | synthesise | copied, then rewritten for `main` (links at a commit, present-tense state) |
| `backend/README.md` | older | `feat/connect-frontend` `759781e` | synthesise | copied, then rewritten for `main` (links at a commit, present-tense state) |
| `frontend/README.md` | older | `feat/connect-frontend` `759781e` | synthesise | copied, then rewritten for `main` (links at a commit, present-tense state) |

Files not in the drift but rewritten because the newest branches made a sentence false: `02-Architecture/Deployment-Diagram.md`, `02-Architecture/System-Architecture.md`, `02-Architecture/Tech-Stack.md`, `02-Architecture/Database/Module-Linkage-Diagram.md`, `04-Development/Backend-Readiness-Checklist.md`, `04-Development/Backend-Loop-Engineering.md` (a dated note; the rule text kept), `05-Testing/Test-Cases.md`. Tool: `04-Development/tools/docs-facts.mjs`.

Left on purpose: everything under `backend/` except its README (code, tests, `tools/load/`), every frontend code file (the connection in `frontend/src/lib/api` and `frontend/src/lib/data`, `vite.config.ts`), and the root `package.json` (its `dev` script no longer runs `git pull origin main` on the source; outside the allowed paths).

## Decisions made in this run

1. **Facts from the newest tip, through git.** `docs-facts.mjs` now reads each side from the newest remote tip that holds `backend/app` or `frontend/src` (both `759781e`), through `git show` and `git ls-tree`, never checking out or merging. It reads the working tree instead when it has the folder and HEAD contains that tip. Links to code read this way point to GitHub at the commit (`blob/759781e/...`), not at a branch name.
2. **Backend lines 14906 to 14562.** The 14906 on the source branch was counted from its working tree, which held the ignored `backend/bootstrap/cache/packages.php` and `services.php`. 14562 counts the committed files only. `main`'s last sheet said 14515 (at `397e000`).
3. **Test counts not re-run.** No database was touched. The sheet's "Test runs" table (Sunday, November 15, 2026 at `397e000`: 1185 and 228) is carried over by the script; a hand-written note below it quotes the newer recorded runs from `08-Logs/Load-Test-Nov16/NOTES.md` (Monday, November 16, 2026: frontend 1250 passed in 146 files at 22:10 PHT; backend 231 passed at 22:35 PHT on `cliniq_check_pest`).
4. **"Uncommitted" removed** from the six "Last checked" lines: the follow-ups and load run is committed at `759781e`.
5. **ADR index and traceability.** `npm run docs:adrs` (80 ADRs) and `npm run docs:trace` (24 requirements, 0 missing links) ran; both changed only their "Generated" timestamp, so both files were restored to the copied version to keep them byte-identical with the source.

## Checks

- `npm run docs:facts`: wrote the sheet; sources printed in its "From commit" line.
- By hand at `759781e`: routes in `backend/routes/api.php` 126 plus the CSRF route = **127**; migrations creating a table **48 of 50**; `APP_ROUTES` entries **45** plus Login and Force Password Change = **47**. All equal the sheet.
- `npm run docs:check`: all six checks pass (numbers, links in 199 files, Mermaid, "Last checked", removed features, AGENTS equals CLAUDE). With `--mermaid` (Chrome, never Edge): all 31 Mermaid blocks render. Links to code at a commit (`https://github.com/zekuuu/cliniq/...`) are skipped by the checker as external, so no new rule was needed. Two number warnings came from the digest's "before" values and were reworded.
- Stale-phrase search over every non-log Markdown file: fixed in the files named above. Left: `frontend/src/lib/mock-db/README.md` line 33 ("not connected yet (ADR-056)"), because ADR-080 point 6 says the mock folder is not edited; listed under "Needs your call". Hits that are still true were left ("runs on sample data by default", ADR history text, the Backend Counter-Check's dated "uncommitted").
- `git diff --name-status origin/main`: every path is in the allowed list; no file under `backend/` other than `README.md`.
- Diagrams: no Mermaid source and no schema changed in this run (`Reference-Schema.sql` is unchanged since `main`), so nothing was regenerated; the ERD 3.2, 3.5 and 3.6 exports were copied from the source, where they were regenerated Saturday, November 14, 2026 — 23:00 PHT.

## Needs your call

- `frontend/src/lib/mock-db/README.md` still says the backend is "not connected yet (ADR-056)". Editing it touches the mock folder that ADR-080 point 6 keeps unedited. Say whether a README there counts.

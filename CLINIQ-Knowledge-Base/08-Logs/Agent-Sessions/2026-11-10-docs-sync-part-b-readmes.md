# 2026-11-10 — Docs sync Part B: every README, and screenshots

Date/Day/Time: Tuesday, November 10, 2026 — 16:55 PHT
Agent: Claude Opus 5.5 (Claude Code), docs-only run.
Branch: written on `backend` at `b51166a`, moved uncommitted to `main` at `8f70297` (Zean: "it should be in main"). The `backend/README.md` change is not on `main` (ADR-056); its patch is kept for the `backend` branch.
Task: Part B of the pre-SRS / Project Plan documentation sync.
Status: Completed

Prompt/Request: Zean, Tuesday, November 10, 2026 (chat): bring every README up to date for a groupmate who will write the Project Plan and SRS from GitHub. Root README short and true (last-checked line, current state, stack, built / decided / not started, roles and screen words, how to run with every command run, repository map, links to Start Here, the Facts sheet and the diagram index); README_ORIGINAL with its minimal-edit rule and a Screenshots section; the knowledge-base and folder READMEs; links checked; screenshots on the fake seed, no real names.

## README inventory

| File | Last commit before this run | This run |
|---|---|---|
| `README.md` | 2026-11-09 | rewritten sections (see below) |
| `README_ORIGINAL.md` | 2026-11-08 | minimal edits, Screenshots section |
| `CLINIQ-Knowledge-Base/README.md` | 2026-10-31 | state, start-here links, folder table |
| `CLINIQ-Knowledge-Base/02-Architecture/Database/Checks/README.md` | 2026-11-01 | true; unchanged |
| `backend/README.md` | 2026-11-09 | state (B0 and B1), install / configure / migrate, settings, structure, clinic-PC production notes |
| `frontend/README.md` | 2026-10-31 | last-checked line and current state |
| `frontend/src/features/auth/README.md` | 2026-11-09 | email reset replaced by the authenticator recovery |
| `frontend/src/features/user-management/README.md` | 2026-10-29 | same |
| `frontend/src/features/reports/README.md` | 2026-10-31 | Admin's month list (ADR-077), Symptom summary, PDF hint, no Clinic Overview |
| `frontend/src/features/backup/README.md` | 2026-10-31 | locations are added and disabled, never edited |
| `frontend/src/features/staff-records/README.md` | 2026-10-31 | ERD approved; import and incomplete page built |
| `frontend/src/features/student-records/README.md` | 2026-10-31 | yearly import built |
| `frontend/src/routes/README.md` | 2026-10-21 | role redirects, link to routes by role |
| `frontend/src/features/account/README.md` | none | new |
| `frontend/src/features/archive/README.md` | none | new |
| `frontend/src/features/settings/README.md` | none | new |
| `frontend/src/{components,hooks,layouts,lib,lib/mock-db,types}/README.md`, `features/{audit-log,clinic-visits,dashboard,emergency-response,inventory,issue-reports,legal}/README.md` | 2026-10-21 to 2026-11-09 | read; nothing false found; unchanged |

Files Modified: the files marked changed or new above; `CLINIQ-Knowledge-Base/03-Design/assets/screens/*.png` (13 new); `CLINIQ-Knowledge-Base/09-References/Canonical-Documents/CLINIQ_Project_Plan.md` (two broken image links, found by the link check, now point to the comparison table in the Review of Related Systems; the images were never committed).

Changes Made:
- Removed as false: "Backend: Not started", "Database: decided, not built" (now approved and migrations written), "proposed draft" ERD wording, the Clinic Overview Report printout (ADR-074), the email password reset (ADR-073), "local LAN" deployment and badge (ADR-079), "Complaint summary" (now Symptom summary, ADR-070).
- Added: the authenticator recovery, account menu, archive and school-year tools, staff import and incomplete page, Admin's view-only reports, Settings and idle sign-out, the docs commands, links to Start Here, the Facts sheet, the ADR index, the diagram index and CONTRIBUTING (the last four are created in later Parts of this run).
- Team and course-adviser lines left as they stand; nobody added.

Decisions taken (unattended, recommendation applied):
- **Screenshots and the demo account names.** The sample seed's School Clinician account is named after the real client nurse, and the Admin account carries another personal name. Editing the seed is code and out of scope. The screenshots replace both names in the rendered page only (Demo Clinician, Demo Principal) before capture; a text check confirmed no real name remained on any capture. Student names in the seed are fictional. Logged as a `FIX` below for the seed itself.
- Admin shots (Dashboard, Reports, Settings) are included; the Admin's account name is replaced the same way.

Testing Performed (every command the root README documents, run Tuesday, November 10, 2026):
- `npm run build` (frontend): built in 2.93 s.
- `npm run lint`: 0 errors, 1 warning (`react-refresh/only-export-components`).
- `npm test`: see the Facts sheet (load-timeout flakes; failing files pass alone).
- `composer install`, `composer test` (85 passed), `composer check` (Pint, Larastan, Pest: pass), `php artisan route:list` (3 routes).
- `npm run docs:facts`, `npm run docs:check`: run.
- Not run: `php artisan migrate` (needs the database password; this run has no access to `backend/.env`). The README says the migrations are not yet run.
- `npm run format:check` (frontend) reports 370 code files unformatted; pre-existing, code is out of scope.
- Screenshots: Playwright with its own Chromium at 1280 × 800 on the Vite dev server (`127.0.0.1`), never Edge. All under 300 KB (`login.png` palette-quantized to 186 KB).

Known Issues:
- `FIX` (Frontend-Issues): the mock seed names the demo accounts after real people.
- `frontend/package.json` `dev` uses `--host 0.0.0.0`, which exposes the dev server on the developer's network. Development only, not the clinic deployment (ADR-079 covers the clinic PC); noted in the hand-back for Zean.

Next Steps: Part C.

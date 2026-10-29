Date/Day/Time: Thursday, October 29, 2026 — 23:01 PHT (system clock; work ran from 22:40)
Agent: Claude Code (Claude Opus 5.5)
Task: Bring every README and README-like guide up to date with the code, make them consistent, and list where they disagree with the canonical documents
Status: Completed (READMEs); two code defects and the canonical-document drift logged, not fixed (out of scope)
Prompt/Request: Zean pasted "Prompt — Bring every README up to date, accurate and consistent, so the team can write the Project Plan and the SRS from them". It asks for READMEs and README-like guides only (no code, ADRs, canonical documents or database design files), verified against the code on the newest branch (`main`), with one status vocabulary (Built (on sample data), Decided, not built, Not started, Deferred), no stale numbers, a "Last checked against the code" line on the state READMEs, a fixed shape per level of README, the zip-export warnings moved to the end, and the ADR-047 to ADR-053 decisions listed only as "Decided, not built". Defaults D1 to D5 kept as written.
Files Modified:
- `README.md` (rewritten to the requested shape)
- `README_ORIGINAL.md`, `setup-step.md`, `URL-Parameters.md`
- `frontend/README.md`, `backend/README.md`, `CLINIQ-Knowledge-Base/README.md`
- `frontend/src/components/README.md`, `hooks/README.md`, `lib/README.md`, `lib/mock-db/README.md`, `types/README.md`
- `frontend/src/features/*/README.md` (all ten existing ones, rewritten to the six headings) and three new ones: `auth/`, `issue-reports/`, `legal/`
- `CLINIQ-Knowledge-Base/08-Logs/Changelog.md`, `Issues-and-TODOs.md`
Changes Made:
- Root README: what CLINIQ is and for whom; how the roles are named (School Clinician, Admin / Principal; "Staff" means staff patients in the app); the words the screens use; current state with a Built table (every route opened in the running app), Decided, not built (ADR-047 to ADR-053), Not started and Deferred; how to run; a map from each part of the Project Plan and SRS to its current source; a short developer section. Removed the stale "approximately 37 screens", "34-table", "18 open decisions" and "26 short explanations (ADR-001 to ADR-026)".
- README_ORIGINAL: first line naming it the longer overview; database MariaDB (XAMPP), MySQL-compatible; Calendar as its own screen (ADR-032), not a Dashboard view; "first-aid checklist" instead of Smart Triage; staff patients added; backend parts marked planned; "16 bespoke skills" and "11 modules" counts removed; Node version corrected; client contact title "School Head Nurse" (source: Team-and-Roles.md, Project Plan Section 2.1), with the app role named.
- setup-step.md: Node version corrected to what the installed tools require; step 6 no longer tells the reader to edit `frontend/package.json` (a tracked file) to add `git pull`; step 7 says what the root `npm run dev` does; database wording.
- URL-Parameters.md: added the nine parameters the code reads that were missing (`search`, `letter` twice, `inClinic`, `patient`, `staff`, `fromVisit`, `sex`, `grade`); completed the `mockEmpty` collection list; fixed the `item` example (`item-0015` does not exist in the seed); marked `focus=search` as not working.
- frontend and backend READMEs: purpose, current state, how to run or what is planned, structure, links; the zip-export boxes moved to "If you are copying a zip export".
- Folder READMEs: missing shortcuts, hooks, form components and types added; the print footer corrected to "Page X of Y" only (ADR-046); the Dashboard printout corrected to the open tab only (ADR-045) with the full LRN (ADR-044).
Reason: A groupmate will write the Project Plan and SRS from the READMEs, so they must be true today and use the same words.
Testing Performed:
- `npm ci` (exit 0), `npm run build` (exit 0), `npm test`: 12 failed, 742 passed, 754 tests in 100 files (7 files failed), dev server not running. Re-running four of the failing files alone still failed 5 tests, so these are not only load timeouts. Logged on the existing `FIX` "15 tests and 5 lint errors already fail on the current branch".
- Node: v26.5.0 used. Minimum from installed `engines`: jsdom `^22.22.2 || ^24.15.0 || >=26.0.0`, Vitest `^22.12.0 || ^24.0.0 || >=26.0.0`, Vite `^20.19.0 || >=22.12.0`. `package.json` sets no `engines`.
- `npm run dev`: served HTTP 200 on port 5173. Every route in `AppRoutes.tsx` opened with Playwright Chromium (not Edge) as `demo.nurse` (33 routes) and `demo.principal` (13 routes); none showed an error state.
- Every `URL-Parameters.md` switch checked in the running app: all work except `?focus=search` (also `Alt + K`), where the search field is not focused.
- Link check (script in the session scratchpad, not the repo): 112 relative links and path references across the READMEs, 0 broken after the edits.
- Root `npm run dev` (it runs `git pull origin main`) was not run.
Disagreements with the canonical documents (for the paper's authors):

| Topic | What the README now says | What the document says | Source in the code or ADR |
|---|---|---|---|
| Database | MariaDB (XAMPP), MySQL-compatible | Project Plan 4.3, 5.3, 7.1 and Frontend Context Brief: MySQL | ERD.md; Issues `DOC` "Change the database wording to MariaDB (XAMPP), MySQL-compatible" |
| Who reaches the system | Runs on the clinic computer; the Admin / Principal signs in there; PE/Sports Instructors have no account | Project Plan 5.3: served to any authorized staff device on the employee Wi-Fi; revision 1.8: PE/Sports Instructor read-only mobile role | ADR-029, ADR-033; `AppRoutes.tsx` has two roles |
| QR and Student Number | Removed; students identified by the LRN | Project Plan revision 1.8 and body: QR path, Emergency button, Student Number | ADR-027, ADR-028 |
| First-aid checklist | "First-aid checklist" inside New Visit | Project Plan: "Smart Triage quick-reference" | `NewVisitEntryPage.tsx`; ERD rule M-1 |
| Calendar | Its own screen for both roles; to be renamed Activity calendar | Project Plan revision 1.8: a calendar view in the Dashboard | ADR-032, ADR-050 |
| Staff patients | Teachers and school staff are patients with their own screens | Project Plan: not mentioned | ADR-043; `features/staff-records/` |
| Sessions | One week, no idle timer; the Admin / Principal signed out after 30 idle minutes is decided, not built | Project Plan 5.1: 1-week session for every role, no idle timeout | ADR-015, ADR-048 |
| Backup | Local only, internal and external drives, no cloud; locations chosen in the system is decided, not built | Modules & Features: a layer beyond local and external "still being evaluated" | ADR-039, ADR-052 |
| Development environment | XAMPP, standardized on every machine | Project Plan 5.3: "XAMPP or Laravel Herd" | ADR-007 |
| Admin / Principal access | Reads on screen, never prints; manages accounts; reads profiles and incidents | Project Plan 2.1: Administration is the consumer of the complaint summary reports | ADR-033, ADR-038 |
| Screen count | No number given | Frontend Context Brief: "~30 screens/views" in its total line and "~35 screens" elsewhere; Screen-Inventory: "~35" | `AppRoutes.tsx` |

Glossary used: School Clinician (role, code `staff`); Admin / Principal (role, code `admin`); Staff (staff patients, code `Personnel`); LRN; Staff No.; Visit; Incident; Follow-Up; Excuse Letter; Inventory; Calendar (page title "Clinic calendar"); Reports; Audit Log; Accounts (sidebar) / User Management (screen); Backup.
Left alone under D2: the root README sentence "The Project Plan and related documents in this repository were prepared as working reference material during planning, not as the team's official deliverable. The formal Software Requirements Specification is being written separately; this repository supports that work."
Known Issues:
- `?focus=search` and `Alt + K` do not focus the Student List search (new `FIX`).
- `?inClinic=1` works on the Visit Log, but nothing links to it; the code comment names a Dashboard chip that does not exist (new `FIX`).
- 12 tests fail on `main` at `dde64408` (existing `FIX` updated).
- The Screen-Inventory count is still open (the `DOC` "README sync" stays open; only its README part is done).
- No source found for: the client's approval of the requirements, the actual week-by-week progress against the Project Plan's 14-week timeline, and spending against the PHP 10,000 budget.
Next Steps:
- Lines that will go stale when the decisions-sheet parts are built: the root README's "Decided, not built" list and the matching "Not built yet" sections in `features/*/README.md`; the "Calendar" wording (Activity calendar, ADR-050); `URL-Parameters.md` and `lib/mock-db/README.md` if `config` or parameters change (ADR-051); `features/backup/README.md` (ADR-052); `features/auth/README.md` and `user-management/README.md` (ADR-048).
- Update the canonical documents for the rows above (a separate prompt; this one does not change them).

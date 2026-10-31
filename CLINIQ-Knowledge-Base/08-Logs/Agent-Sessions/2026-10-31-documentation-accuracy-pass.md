Date/Day/Time: Saturday, October 31, 2026 — 19:24 PHT
Agent: Claude Code (Opus 5.5)
Task: Documentation accuracy pass: check every markdown document against the code and the ADRs before backend work starts
Status: Completed, with the limits under Known Issues
Prompt/Request: Zean, by a pasted prompt ("Documentation accuracy pass: check every markdown file against the code before backend work starts"), on a branch `docs/accuracy-pass` from the newest branch: compare every markdown document with the code and the ADRs, fix what is stale, list what may not be fixed, and change no code. No commit and no push.
Files Modified: see the change table and `git status` on `docs/accuracy-pass`. Started from `main` at `9b4861db` (the prompt's last check named `b830cee`; `main` had moved on by two commits). Nothing is committed.
Changes Made: see below.
Reason: The backend should begin from accurate records (ADR-056).
Testing Performed: the baseline below, a link checker over every relative link, a stale-term search, the facts inventory. No Mermaid parser is installed in the repo, so the edited diagrams were not rendered.
Known Issues: see below.
Next Steps: Zean reviews and commits this branch and merges it before `backend` is created. Claude updates the canonical documents from the list below.

## Baseline (Saturday, October 31, 2026 — 19:07 PHT, commit `9b4861db`, Node 26.5.0)

| Check | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run build` | Pass |
| `npm run lint` | 1 error, 2 warnings. Error: `react-hooks/refs` at `NewVisitEntryPage.tsx:298` |
| `npm test` | 830 passed, 12 failed, 842 tests, 108 files (7 files failed) |

Failing tests: `BackNavigation.test.tsx` (staff and admin `/calendar`), `lib/mock-db/sync.test.ts` (renamed student), `lib/mock-db/stock.test.ts` (expired stock after restock), `ui-review-regressions.test.tsx` (4), `StudentProfilePage.test.tsx` (excused periods), `form-cancel.test.tsx` (1), `back-navigation.test.tsx` (2). Causes were not investigated: no code changes in this task. Several read like date-dependent or complaint-label failures.

Link check: 538 tracked files, 1,191 relative links, 33 broken before the pass . 29 are anchors inside `Data-Dictionary.md` (do not edit, listed), 2 are missing images in the Project Plan (canonical, listed), 2 are in past `Agent-Sessions/` (history). Recheck after the pass (Saturday, October 31, 2026 — 19:26 PHT): 1,214 links, the same 33 broken, all in files this pass may not edit.

## Facts inventory (from the code, `9b4861db`)

| Fact | Value | Source |
|---|---|---|
| Roles | `staff` (School Clinician), `admin` (Admin / Principal) | `lib/mock-db/session.ts` |
| Routes in the guarded table | 38 | `routes/AppRoutes.tsx` |
| Staff only | student add/edit, Incomplete Records, every `/staff`, `/visits`, follow-ups, inventory, sports-report and notifications route, incident add and complete | `AppRoutes.tsx` |
| Admin only | `/users`, add and edit user | `AppRoutes.tsx` |
| Both | Dashboard, `/calendar`, Student List and Profile, Incident Log and Report, Reports, Audit Log, Privacy Policy, Backup | `AppRoutes.tsx` |
| Session | 7 days; lockout 5 attempts, 30 minutes; last 5 passwords kept; minimum 8 characters | `session.ts`, `api.ts` |
| `config` | frequent visitor 3 in 14 days; upcoming follow-ups 7; expiry 30; cluster trend 8 and ratio 2; top complaints 5; percentMinPriorCount 5; staleBackupHours 48; medical certificate 3; Admin idle 30; cluster 3 students in 3 days; follow-up overdue 3, closed 7; backupKeepLast 60; unusualAgeYears 3; fever 37; temperature 30–43; pulse 30–250; oximeter range null | `mock-db.json` |
| Personnel types | Teacher, Non-teaching staff, Utility worker, Other | `mock-db.json` |
| Seed | 3 users, 52 students, 12 personnel, 179 visits, 25 incidents, 16 follow-ups, 14 items, 2 reports, 5 backup logs, 27 audit rows | `mock-db.json` |
| Holidays | 2026 only, 21 rows | `holidays-ph.json` |
| Mock API | 103 exported functions, 10 exported constants, 2,977 lines | `api.ts` |
| Feature folders | 13; 33 `*Page.tsx`; 22 feature `api/` files | `features/` |
| Tests | 108 files, 842 tests | Vitest |
| Skills / ADRs | 17 / ADR-001 to ADR-056 | `.claude/skills/`, `06-Decisions/` |
| Scripts | `dev`, `build`, `lint`, `preview`, `format`, `format:check`, `test`, `test:watch`, `typecheck`; root `dev` pulls `main` first | `package.json` |
| Node | `^22.22.2 || ^24.15.0 || >=26.0.0` (oldest the test tools accept) | `package-lock.json` |
| Versions | React 19.2, React Router 7.18, Vite 8.3, TypeScript 6.0, Tailwind 4.3, Vitest 5.0, Chart.js 4.5 | `package.json` |
| Entity notes | `Student` has `birthDate`, `emergencyContacts`, no own number and **no section**; `Visit` and `Incident` have `gradeLevelAtTime`; `Personnel` is the staff patient | `types/entities.ts`, `mock-db/types.ts` |

## Area log

- Area A1 done — README's "Decided, not built" cut to the two items really unbuilt, Activity calendar, Reports and Backup rows; URL-Parameters student id; AGENTS and CLAUDE skill count kept in sync. `README_ORIGINAL.md` listed, not edited.
- Area A2 done — "Not built yet" sections of 10 feature READMEs corrected, rules added, `frontend/README.md`, mock-db and `backend/README.md` "Last checked" lines, `useIdleSignOut` in the hooks README.
- Area A3 done — Objectives, Scope, Team, Functional and Non-Functional Requirements synced to the Plan; Module Overview corrected; User Roles updated.
- Area A4 done — Tech Stack, System Architecture, Data Retention, Data Flow, Use Case, Activity and Module Linkage pages corrected. Every Module Linkage row was checked against the code: 15 of 18 hold as written; 3 got a "not built" or "mock only" qualifier.
- Area A5 done — Screen Inventory and Reference Screens synced to the Brief and Design Reference; Development Phases, Environment Setup, Readiness Checklist, Keyboard Shortcuts, Coding Conventions, Skills Setup corrected. Design tokens: every hex in `Design-System.md` matches `index.css` and `tokens.ts`. `Audit-Coverage.md` and `Frontend-Loop-Engineering.md` (history notes) needed no change.
- Area A6 done — Test-Cases, the two `07-AI-Agents` pointers, and three skills corrected. Nine skills read in full; the other eight were only term-searched and their component names confirmed.
- Area A7 done — counts recomputed; 11 entries resolved and moved (4 `FIX`, 1 `LATER`, 6 `DOC`); new section added.
- Area A8 done — Privacy Policy gained the staff paragraph; the rest needs the same fix in the screen, so it is a `FIX`. Summary and catalog needed no change.
- Area A9 done — all nine vault copies carry the current canonical text where the code agrees. The `DOC` is resolved.

## Change table (the ones that matter most)

| File | It said | It says now | Evidence |
|---|---|---|---|
| `README.md`, 10 feature READMEs | 13 features "decided, not built" | Built; only the yearly import and the email reset remain | Code probes; Changelog Parts 1 to 6 and ADR-054 |
| `Backend-Readiness-Checklist.md` | 64 functions, 1,500 lines, 3 roles, 21 api files | 103 functions, 2,977 lines, 2 roles, 22 api files | Facts inventory |
| Same | Six open decisions | Four settled (ADR-049, ADR-050, sign-off rule) | `api.ts:1652`, `api.ts:1775` |
| `Module-Overview.md` | One expiry per item; Monday weeks; "ten modules"; student contact number; `{TS}` placeholder | Batches (ADR-030); Sunday weeks (ADR-055); module list; no own number; the real date | `api.ts`, `lib/dates.ts:164` |
| `Module-Overview.md` | Incomplete flag includes allergies and conditions | Those two removed | `selectors.ts:225` |
| `Development-Phases.md` | B8 one expiry date; B10 three roles; B1 blocked on the SRS | Batches; two roles; ERD approval | ADR-030, ADR-029, ADR-056 |
| `Tech-Stack.md`, `System-Architecture.md`, `Environment-Setup.md` | MySQL; nothing installed; Vite proxy | MariaDB; frontend installed; CORS, no proxy | `vite.config.ts`, ADR-056 |
| `Use-Case-Diagram.md` | Admin views and prints reports | Admin never prints; Student, Incident, Backup, Audit and calendar use cases added | ADR-038, ADR-042, ADR-048 |
| `Data-Retention-Policy.md` | Audit trail "shorter" | 10 years | ADR-037, ADR-051 |
| `Screen-Inventory.md` | "Notes or at least one line is required" | Both optional | Amended ADR-018 in Module 3 |
| `cliniq-item-picker-patterns` | "Visits need notes or at least one line"; nothing is matched | Neither is required; the tag warns | ADR-049 |
| `Test-Cases.md` | "no code exists yet" | Tests live beside the code | Facts inventory |

## Canonical-document contradictions (for Claude; not edited)

| File | Section | It says | The code or an ADR says |
|---|---|---|---|
| Modules & Features | Incomplete Record Handling | Flags missing allergies and conditions | Full name, grade, sex, emergency contact only (`selectors.ts:225`) |
| Modules & Features | Module 11, Operational lists | 10 or 20 rows per page | 10, 20, 50 or 100 (`usePageSize.ts`) |
| Frontend Context Brief | §4 #10, #15 | Rows per page 10 or 20 | Same |
| Modules & Features; Frontend Design Reference | Birthdate; Reference 3 | Age "9 years" | "9 years old" (`lib/age.ts`) |
| Modules & Features | Module 1, User Account Management | "no self-service recovery" beside the email reset two sections later | ADR-048 keeps the email reset; the two lines disagree |
| Modules & Features; Project Plan 5.1 | Password Management | "Change password (self-service)" | Only the forced change exists (`FIX` logged) |
| All four; ADR-047 | Yearly list | A record keeps grade **and section** | No `section` on `Student`; grade only (`FIX` logged) |
| Frontend Context Brief | §4 #31 | Possible-cluster alert under Trends | It is on Overview (`ClusterAlerts.tsx`); Trends keeps a chart marker |
| Frontend Context Brief | §4 #3 | "Calendar" in the Admin's list | "Activity calendar" (ADR-050) |
| Project Plan | 4.3 Authentication | "SPA-mode token/cookie auth" | SPA cookie mode, no tokens (ADR-056) |
| Project Plan | 3.2, 3.3 | Images `images/table_3_2_clinical.png`, `images/table_3_3_inventory.png` | The files are not in the repository |
| All four | — | Brought up to ADR-053 | ADR-054 is in; ADR-055 and ADR-056 are not |

## ERD, Data Dictionary and Reference Schema differences (listed, not edited)

- `contact_number` on students and no `birth_date` (ADR-054; already logged).
- None of the three holds: staff patients (`personnel`, ADR-043, ADR-053), `extra_complaints`, `collected_by`, `avoid_if_allergic_to`, `grade_level_at_time`, `acknowledged`, backup locations (ADR-052), stay-home fields, or the stored letter wording (ADR-049).
- `ERD.md` still names `SmartTriage`, "64 mock functions" (103 now), and says `Environment-Setup.md` and the Tech Stack say "MySQL" (fixed by this pass).
- `Data-Dictionary.md`: its frontend line lists `contactInfo` on `Student`, and 29 table-of-contents anchors do not resolve.

## `DOC` and `FIX` logged

`FIX`: self-service password change; section not stored; Privacy Policy screen and draft against ADR-038 and ADR-051. `DOC`: formatter wording against the repo; canonical update from this list; backend file: ERD differences. Updated the existing test `FIX` with this baseline.

## Questions (two documents disagree and the code is silent)

1. **One computer, or the LAN?** The Project Plan (ADR-029) says the system is used on the clinic computer only. `CLAUDE.md`, `AGENTS.md`, `README.md`, `Tech-Stack-Summary.md` and the Privacy Policy say LAN. Left as they are.
2. **Week start.** The Dashboard Trends month chart runs Monday to Sunday, while the Monthly Report (ADR-055) and the Trends printout run from Sunday. ADR-055 covers only the Monthly Report.

**Answered by Zean (Saturday, October 31, 2026 — 19:28 PHT):** (1) clinic computer only. **Corrected by Zean (Saturday, October 31, 2026 — 19:36 PHT): deployed over the LAN too.** The LAN wording is restored, hosted on the clinic computer; `Scope.md`, the NFR, `Tech-Stack.md` and `Overview.md`, synced earlier from the Plan, now say so too; note added to ADR-029. The Project Plan 1.4, 4.3, 5.1, 5.2 and 5.3 say "used on that computer" and join the canonical list. (2) Yes, they should match: Sunday to Saturday. No code on this branch, so it is a `FIX`, with a note on ADR-055.

## Follow-up: Zean, Saturday, October 31, 2026 — 19:46 PHT

Prompt/Request: "fix all the FIX you added and DOC or anything you added, do it now". The pass's no-code rule no longer applied, so code went onto this same branch.

- Trends month chart runs Sunday to Saturday (`lib/mock-db/dashboard.ts`, `ComplaintTrends.tsx`, test).
- Optional section on students, `sectionAtTime` on visits and incidents (`entities.ts`, `api.ts`, the student form and profile).
- Change Password screen at `/account/password`, linked from the top bar, with `changeOwnPassword` and `ChangePasswordPage.test.tsx`. The current password is required.
- Privacy Policy screen and draft corrected together; the audit retention period stays unstated until the school confirms it, as the NFR says.
- Canonical documents updated (Project Plan revision 2.9). The two missing Project Plan images stay missing: the files are not in the repository.
- Formatter wording corrected in `AGENTS.md`, `CLAUDE.md` and `Coding-Conventions.md`.
- ERD differences written to `Database/ERD-Review.md`, as the entry said. The drafts themselves stay unedited (ADR-056 item 6).

Testing: typecheck and build pass; lint unchanged (1 error, 2 warnings); tests 833 passed, 13 failed of 846. Twelve are the baseline failures; `IncidentSafety.test.tsx` failed once under full-suite load and passes alone (14 of 14).

## Known Issues

- Eight component skills were term-searched, not read line by line. Past `Agent-Sessions/`, `Changelog.md` rows and ADR decision text were history and not checked for accuracy.
- `Frontend-Loop-Engineering.md` keeps its old notes as history. `Design-Audit-Reference-Mockup.md` still says Student Number: it is a dated audit record, left as written.
- Edited Mermaid blocks were not rendered. `Diagrams/Module-Linkage.png` and `.svg` are unchanged; only the table beside them changed.
- Challenge: `Coding-Conventions.md` and `AGENTS.md` say no formatter is prescribed, but ESLint and Prettier are configured. A short decision would settle it.

**Timestamp note:** the 19:24 and 19:26 stamps in this log and the entries it wrote were estimated, not read from the clock; real clock reads around them were 19:20 and 19:28. The later stamps are clock reads.

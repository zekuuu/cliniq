Date/Day/Time: Sunday, November 1, 2026 — 11:26 PHT
Agent: Claude Opus 5.5 (Claude Code)
Task: Frontend clean-up, Part 1: contract fixes, green checks, small fixes (A1 to A5, B1 to B3, C1 to C14)
Status: Completed. Nothing committed. Parts 2 and 3 not started.
Prompt/Request: `Prompt-Frontend-Cleanup-Code-Nov1`, run on the `backend` branch from `7dc0d660` (default Part 1). Zean's answers during the run, Sunday, November 1, 2026 — 11:05 PHT: a cancelled follow-up gets no new date (this reverses the contract's and panel review FU-4's "Missed or Cancelled"), and the Privacy Policy wording below is accepted.
Files Modified: `frontend/` code and tests (group a); `API-Contract.md`, `Module-Overview.md`, `Privacy-Policy.md`, `URL-Parameters.md`, ADR-056 (dated note), `cliniq-sidebar-patterns` skill, `Frontend-Issues-and-TODOs.md`, `Issues-Done-Archive.md`, `Frontend-Changelog.md`, this log (group b). No file under `backend/`. `mock-db.json` untouched.
Changes Made:

| Item | Change | Test or check |
|---|---|---|
| A1 | The audit summary says "Name corrected"; the reason is stored as `nameCorrectionReason`. Every other audit write was read: they pass field names (`changedSummary`), fixed text or counts. Print titles are fixed or month text. No other write carries a typed value. | `contractFixes.test.ts` Q3 |
| A2 | `rescheduleFollowUp` uses the effective status and writes Missed on a follow-up that only read as Missed. Completed, Cancelled and pending are refused. The Follow-Ups row gains "Set a new date"; Cancel no longer offers it. | `contractFixes.test.ts` Q7; `FollowUpListPage.test.tsx` |
| A3 | The stay-home flag and note carry over; the audit entry holds neither. | `contractFixes.test.ts` Q7b, student and staff |
| A4 | `StudentListRow` is the six columns, LRN masked. Readers checked: Student List, Incomplete Records, Visit Log, Incident Log, Sports Report roster; none read health fields, contacts or birthdate (typecheck agrees). Three of them join or search on the full LRN on the client, so `listStudents` and `getIncompleteRecordQueue` take a mock-only `fullLrn` option; the backend does that work itself. | `contractFixes.test.ts` Q2 |
| A5 | Audit log kept 10 years; the staff sentence reworded, on the screen and in the draft. | `PrivacyPolicyPage.test.tsx` |
| B1 | Cause list below. | Three full runs |
| B2 | `lastSavedDisposition` is state. Unused `validateFollowUp` deleted; `buildIssueMailto` no longer exported. | `npm run lint` clean, 0 warnings |
| B3 | `minuteClaimer` in `seed.ts` steps a colliding visit back a minute, same day, never future. | `countsAndSeed.test.ts`, 7 weekdays at 3 clock times |
| C1 | Footer links, separators and version at 12px. | Chromium: 12px, one line, no overflow |
| C2 | Listbox in the tab order; focus passes on to the option. | axe clean with the list forced to scroll; Tab still closes it |
| C3 | Cleared on leaving Force Password Change. | `frontend-cleanup.test.tsx` |
| C4 | `text-text-secondary`. | axe `color-contrast` at 375, 768, 1280 |
| C5 | `ErrorState asPageTitle` on 33 page-level branches. | axe `page-has-heading-one` on `/students/1999-99999` |
| C6 | Save returns with `navigate(-1)`; `lib/savedMessage.ts` carries the confirmation. | `frontend-cleanup.test.tsx`, `back-navigation.test.tsx` |
| C7 | `@media print` rule on `[data-skeleton]`. | Chromium print media, while loading and after |
| C8 | Referral fields prefilled. | `frontend-cleanup.test.tsx` |
| C9 | `DemoAccounts` only in `import.meta.env.DEV`. | `frontend-cleanup.test.tsx`; build grep below |
| C10 | `FullReportLink` under the summary and on Common complaints, with tab and month by router state. | `frontend-cleanup.test.tsx` |
| C11 | Focus when the list is ready or the URL changes. | `frontend-cleanup.test.tsx` |
| C12 | Dashboard "in clinic now" chip, Staff link, Admin count. | `frontend-cleanup.test.tsx` |
| C13 | `printAll` dropped from the Dashboard. | Suite |
| C14 | Closed as an accepted limitation: `RouteLoading` has no route fallback, and the chunk loads in under a second on the LAN. | None needed |

Reason: finish the frontend's open items before the backend integration, so the backend copies a correct mock.

B1 causes:
- Real bugs: the seed collision (B3); `usePrinting` subscribed in a passive effect, so a print fired right after the paint found no listener (now a layout effect, which ended the "No print document mounted" flakes).
- Wrong tests: Calendar missing from the no-Back list (it is a sidebar screen, ADR-032); `•` instead of `●` in a mask check; the Visit Log opens on today, not All; tests typing into "Other complaints" since Complaint became a Select; a fixed `2026-10-17` date; a date range that ignored `toSchoolDay`; a test of the removed always-on backup indicator, now testing that a healthy backup raises no chip.
- Slow: keystroke delay removed (`delay: null`) in the seven slowest suites. `AppRoutes.test.tsx` has one file-level 5 s wait, with its reason and the 1.2 s measured, for cold lazy chunks. No `skip`, no `retry`, no blanket timeout. `DashboardPage.tsx:63–77` was checked: no conditional hooks there.

Testing Performed:
- Baseline: typecheck 0 errors; lint 1 error, 2 warnings; Vitest 846 of 861 passed, 15 failed.
- After: typecheck 0; lint 0 errors, 0 warnings; build passes; Vitest 887 of 887, three consecutive full runs.
- Tests changed on purpose: the follow-up test now uses Missed (Zean's decision); the name-correction test asserts the reason stays out of the audit.
- Chromium and axe ran from a scratch folder; no dependency added to the repository.

Known Issues:
- C9: the build no longer has the Demo Accounts panel ("Standard Staff access" is gone), but `demo.nurse`, `demo-nurse` and the other demo logins remain in the bundle, inside the seed (`mock-db.json`). The mock signs in from them and must stay (ADR-056 rule 4). They leave when Sanctum replaces the mock.
- New `FIX` entries: the name-correction reason has no screen now; "Set a new date" can be used twice; Edit Staff has the Edit Student Back defect.
- `TZ=Asia/Manila date` in Git Bash on this machine prints UTC, eight hours behind (02:52 against the real 10:52). Timestamps here come from the Windows clock. Earlier logs stamped this way, such as the backend logs at 02:44 PHT, are probably eight hours early.
- Canonical documents need updating: the follow-up rule (a cancelled follow-up gets no new date) and the Privacy Policy wording (`09-References/Canonical-Documents.md`). `Backend-Issues-and-TODOs.md` still lists Q2, Q3, Q7 and Q7b; backend entries are not edited here.

Next Steps: Part 2, then Part 3.

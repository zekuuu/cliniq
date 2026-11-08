Date/Day/Time: Saturday, November 07, 2026 — 16:28 PHT (local clock, UTC+8)
Agent: Claude Code (Opus 5.5)
Task: Four follow-ups from the backend counter-check, on `main`: Screen Inventory, the email-reset entry, the Admin's staff audit line, and the three old failing tests
Status: Completed
Prompt/Request: "Prompt — Four follow-ups from the backend counter-check (docs on `main`, and the three old failing tests)". The backend counter-check (`Backend-Counter-Check-Nov7.md` on `backend`) audited `main` at `cfd4bd84` and left four items for `main` (C-6, C-15, C-8, C-19). Zean's rule: fix or decide in the run, and do not park items in the issues log.

Files Modified:
- CLINIQ-Knowledge-Base/03-Design/Screen-Inventory.md
- CLINIQ-Knowledge-Base/01-Requirements/User-Roles-and-Permissions.md
- CLINIQ-Knowledge-Base/08-Logs/Frontend-Issues-and-TODOs.md, Issues-Done-Archive.md, Frontend-Changelog.md
- frontend/src/features/review-round-2.test.tsx
- frontend/src/features/print-documents.test.tsx

Changes Made:
1. **Screen Inventory (C-6).** Added two rows: 9e **Import Staff List** (`/staff/import`, ADR-069) and 9f **Incomplete Staff Records** (`/staff/incomplete`, ADR-067). Each gives the route, Staff only, the entry button, the purpose, the main actions and keyboard notes. Then I compared every row with `AppRoutes.tsx` (routes, titles, roles) and fixed six rows:
   - #1 Login: "Forgot password?" is the authenticator recovery: the username is checked first, then a code, then a new password; with no authenticator, ask the Admin (ADR-073). It still said "email reset".
   - #3 App Shell: the Admin's list includes Archive (ADR-072). Sign out lives in the account menu (#38, ADR-066), not a red header icon.
   - #4 Staff Dashboard: no Print (ADR-074).
   - #9 Incomplete Records: now names its route and Staff only.
   - #21: renamed to "Symptom summary" (ADR-070).
   - #28a: a large write-off is marked in the audit and the note is optional (ADR-068); it said the note was required.
   - #35 Audit Log: staff-record entries show the Staff No. only, and the Admin cannot open them; the full LRN appears only on the printout.
   - Every other route, title and role matched.
   - The Frontend Context Brief §4 (the canonical twin) is already behind on several rows. The open `DOC` entries for ADR-067, ADR-069 and ADR-072/073 cover it, so it was not edited here.
2. **Issues (C-15).** Closed the `LATER` "Backend: email password reset": replaced by ADR-073, and accounts have no email address. Also closed the `FIX` "Three tests fail since the yearly calendar redesign" (item 4). Both were moved unchanged to `Issues-Done-Archive.md` under their section headings, with a Resolved timestamp and this session's link.
   - Searched for other email assumptions: the parent-email notes (337, 350) are about students' families, not accounts, and stay. The `DOC` "Canonical documents for ADR-072 and ADR-073" still rightly says the canonical documents mention an email reset, so it stays open.
   - Counts: FIX 2, AUDIT 0, DOC 32, DECIDE 2, LATER 21; NOTE 80, VERIFY 30; Done 487.
3. **User roles (C-8).** Added one line: the Admin's Audit Log lists staff-record entries by Staff No. only and cannot open them (ADR-038, ADR-043). It matches `AuditLogPage.tsx` `targetPath`, where the Admin opens only student profiles, incident reports and reports, and the Staff No. label in `selectors.ts`.
   - Checked the Admin row: no staff patient screens, read-only audit log; no change needed there.
   - Fixed one wrong line: the Archive line said only Staff change the dates. Only Staff also end or start a school year, and the Admin gets no button or reminder (ADR-075).
4. **The three failing tests (C-19).** All three failed since `1b50a113` ("redesign yearly calendar view"). In each case the code was right and the test was out of date.
   - **Calendar, legend and table-month tests:** the shared helper `yearly()` waited for the text "Activity, event, and holiday days". The redesign deliberately removed that summary and put a "Calendar key" list above the months instead. The helper now waits for that list; it is the same intent (the year view has rendered). The holiday assertions (the hidden "Holidays:" line and the "Holiday" key entry) and the table assertions (month names without the year, Total centred, Visits left-aligned) are unchanged and pass.
   - **Student Health Record visit count:** the redesign's seed added visits 0180 to 0191, one per student, and `visit-0183` belongs to student-0004. That student now has 13 visits, none entered in error. The printout correctly prints every visit; the test expected the old 12. It now expects 13, with a comment. The intent "every visit, more than the screen's eight" holds.

Reason: the counter-check before B1 handed these four items to `main` (Zean's request).

Testing Performed:
- Before: typecheck 0 errors, lint 0 errors, tests 1137 of 1140 (the three above).
- After:
  - typecheck 0 errors, lint 0 errors
  - three full runs, each 1140 of 1140
  - build passes
- No axe run: no screen code changed, only two test files.

Known Issues: none from this run. The canonical Frontend Context Brief §4 stays with its existing `DOC` entries.

Next Steps: none for these four items.

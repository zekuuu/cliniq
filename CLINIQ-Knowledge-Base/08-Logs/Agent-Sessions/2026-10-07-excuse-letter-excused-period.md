Date/Day/Time: Wednesday, October 07, 2026 — 13:01 PHT (system clock)
Agent: Claude Code (Opus 5.5)
Task: Add an explicit excused period to excuse letters and show it on the Student Profile
Status: Completed
Prompt/Request: "Add an explicit excused period to excuse letters, shown on the student profile. This is a light link to absences. The clinic doesn't own attendance, so this records the dates and does not integrate with MCA's attendance system." The letter gets "Excused from" (default: the visit date) and "Excused until" (default: same day), both required, "until" not before "from". Show the period on the letter and its print layout, and in the student profile's excuse-letter list (e.g. "Oct 3 – Oct 5, 2026 · Sent home") with a link to the visit. Keep the generate / nurse-approval / permanent-storage flow; follow the current edit rules for approved letters and say what they are. No maximum span, no new approval rule. Keep visibility unchanged. Fields provisional pending the ERD, listed in Frontend-Issues-and-TODOs. Update seed data and tests, add one sentence to Module-Overview Module 3, verify live with Playwright, run typecheck, tests and build, log the session and add a Changelog row.

Clarifications asked and answered before editing:
- The Student Profile had no excuse-letter list, so nobody saw letters there before. Answer: the new list is **Staff only** (Module 3 is Staff-only, and the visit link target, Visit Details, is Staff-only). The PE/Sports Instructor profile view is unchanged.
- No edit rule existed for approved letters: after approval the checkbox and button locked, but recipient and body stayed typeable and were never saved (only approver and time were stored). Answer: **lock the period once approved**.

Repo state check (AGENTS.md Step 0): fetched all remotes; `main` matched `origin/main` and was clean; `feature/clinic-overview-dashboard` had nothing ahead of `main`. The structured-medicines work (ADR-018, Changelog 10:43 PHT) had already landed on `main`, so the visit files were current. This change did not edit any visit page.

Files Modified:
- `frontend/src/lib/mock-db/types.ts` — `ExcuseLetterApproval` gains `excusedFrom` / `excusedUntil` (provisional).
- `frontend/src/lib/mock-db/api.ts` — `excusedPeriodError` (both required, until ≥ from), `approveExcuseLetter(visitId, period, actor)` validates the period and rejects a second approval of the same letter, new `getStudentExcuseLetters(studentId)`.
- `frontend/src/lib/mock-db/seed.ts`, `integrity.ts`, `mock-db.json` — period resolved from relative dates; integrity check requires both dates and until ≥ from; existing seed letter gets a one-day period; new seed letter for visit-0139 (Sent home, 3-day period).
- `frontend/src/features/clinic-visits/api/excuseLetterApi.ts`, `ExcuseLetterPage.tsx` — two required `DatePicker`s (defaults: visit date), inline error, Approve disabled while invalid, both fields disabled after approval with the hint "Fixed once the letter is approved.", "Excused period: …" line on the letter and its print layout.
- `frontend/src/features/student-records/api/studentProfileApi.ts`, `StudentProfilePage.tsx` — Staff-only "Excuse Letters" card: "<period> · <disposition>" with a "View visit" link. Instructor fetches never load letters.
- Tests: `ExcusedPeriod.test.ts` (new), `ExcuseLetterPage.test.tsx`, `StudentProfilePage.test.tsx`, `integrity.test.ts`.
- Docs: `Module-Overview.md` (Module 3 sentence), `Frontend-Changelog.md`, `Frontend-Issues-and-TODOs.md`, this log.

Changes Made: as listed above. Display privacy: the profile is a deliberate single-student lookup, so the card needs no masking; no multi-student list was added. Audit trail: approval still writes one `approve` entry on the excuse letter; no new write path was added.

Reason: Teachers and the registrar need the dates a student was excused to cross-check attendance. The clinic doesn't own attendance, so CLINIQ records the dates only.

Edit rules for approved letters (as asked to state):
- Before this change: an approval stored only approver and time. Recipient and body could still be typed after approval but were never saved. The UI blocked re-approval; the data layer silently replaced an existing approval.
- After this change: the period is stored with the approval and is fixed. Both date fields are disabled once approved, and the data layer rejects a second approval ("This excuse letter is already approved and stored."). Recipient and body behaviour is unchanged.

Testing Performed:
- `npm run typecheck` — clean.
- `npm test` — 285 passed.
- `npm run build` — succeeded.
- `npm run lint` — 1 error and 2 warnings, all in files this change did not touch (`ReportIssueModal.tsx` set-state-in-effect error; react-refresh warnings in `FollowUpPrompt.tsx` and `ReportIssueModal.tsx`).
- Live check: the Playwright MCP server wasn't attached to this session, so the same check ran as a Playwright script (scratchpad install, cached Chromium) against `vite` on port 5199. Results: draft defaults to the visit date on both fields and on the letter; moving "from" past "until" shows "Excused until can't be before Excused from." and disables Approve; picking a valid "until" updates the letter ("Sep 10 – Sep 11, 2025"); approval locks both fields; print media shows the period line; Staff profile for 2021-00002 lists "Sep 28 – Sep 30, 2026 · Sent home" and View visit opens `/visits/visit-0139`; no horizontal overflow at 375px; PE Instructor profile shows no Excuse Letters card; no console errors.

Known Issues: see the "Excuse letter excused period" section of `Frontend-Issues-and-TODOs.md` (provisional fields, draft wording never stored, re-audit of #7 and #13, canonical drift, a DatePicker keyboard quirk seen in the live check).

Next Steps: run the Phase 2 Countercheck/Audit on #7 and #13; add the Module 3 sentence to the canonical Modules & Features document; settle the fields in the ERD.

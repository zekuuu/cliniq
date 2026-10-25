Date/Day/Time: Monday, October 26, 2026 — 02:47 PHT
Agent: Claude Code (Opus 5.5)
Task: Fix Visit Details edit/save failing since Monday, October 26
Status: Completed
Prompt/Request: "Fix it now" (the FIX logged in [2026-10-26-visit-details-drop-duplicate-badge](2026-10-26-visit-details-drop-duplicate-badge.md))
Files Modified:
- frontend/src/lib/mock-db/relativeDates.ts
- frontend/src/lib/mock-db/relativeDates.test.ts (new)
- frontend/src/features/form-focus-invalid.test.tsx
- CLINIQ-Knowledge-Base/08-Logs/Issues-and-TODOs.md, Issues-Done-Archive.md, Changelog.md
Changes Made:
- Root cause: the seed resolves relative dates against today, with fixed times. visit-0157 is seeded "today at 07:12"; run at 02:43, it was in the future, so the Visit Details edit form rejected it ("The visit date and time can't be in the future.") and Save never succeeded. This hit the running app too: before school hours, none of today's seeded visits could be edited. It looked like a date change only because the session crossed midnight.
- Fix: `resolveDateTime` / `resolveSchoolDateTime` scale a time on the real today that is later than the clock into midnight–now (`notAfterNow`). Order is kept (a visit stays before its letter), nothing lands in the future, and other days, times already past, and a fixed mock today that isn't the real day are unchanged. New `relativeDates.test.ts` pins the clock at 02:43 to cover both cases.
- `form-focus-invalid.test.tsx` "Visit Details edit" had a second, older cause: it cleared the complaint as a text combobox, but the complaint is now a dropdown. It now picks "Other (type your own)", like `VisitDetailPage.test.tsx`.
Reason: User request.
Testing Performed: Debugged with a throwaway test that printed the form's errors (deleted). `npx tsc -b` clean. `vitest run` on clinic-visits, form-focus-invalid and relativeDates: 125/125. Full suite: the 17 remaining failures are the set that was already failing on Sunday, October 25 (back-navigation, form-cancel, print-documents, ui-review-regressions, BackNavigation /calendar, IncompleteRecordsQueuePage, StudentProfilePage, stock, sync); now 16 with form-focus-invalid fixed.
Known Issues: Those 16 older failures are not tracked by this session.
Next Steps: Investigate the remaining older failing tests.

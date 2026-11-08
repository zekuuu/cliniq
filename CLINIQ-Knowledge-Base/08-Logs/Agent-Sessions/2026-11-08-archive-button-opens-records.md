# Archive button opens the archived records

Date/Day/Time: Sunday, November 08, 2026 — 17:21 PHT
Agent: Claude Code (Opus 5.5)
Task: Make the Student and Staff Lists' Archive buttons show the archived records, not just open the page.
Status: Completed
Prompt/Request: "the archive button in student and staff list only redirect to the page, it should show actual" (the message ends there; read as: show the actual archived students or staff).
Files Modified:
- `frontend/src/features/archive/ArchivePage.tsx`, `frontend/src/features/archive/ArchivePage.test.tsx`
- `frontend/src/features/student-records/StudentListPage.tsx`, `frontend/src/features/staff-records/StaffListPage.tsx`
- `CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md`
Changes Made:
- The list buttons pass `state={ ...DRILL_THROUGH_STATE, section: 'students' | 'staff' }`.
- `ArchivePage` reads `state.section`: it opens that tab and, once loaded, scrolls the tabs into view (`scroll-mt-20` clears the sticky top bar; instant with reduced motion). Opened from the sidebar, nothing changes.
- Found while doing it: the Archive's Back (`drillThroughOnly`) was meant to show after the Student List's button, but the link carried no drill-through state, so it never showed. It does now, from both lists.
- The year shown is still the newest year with archived records (`defaultYear`); the button's count covers every year.
Reason: The button landed on the Students tab under the school-year cards, so the Staff List's button never showed staff, and neither showed the records without scrolling.
Testing Performed: `npx vitest run` on archive, student-records, staff-records and routes (all pass, with a new test: each list's button opens its tab with Back); `tsc -b`; ESLint. Not checked in a browser.
Known Issues: None.
Next Steps: None.

## Follow-up — Sunday, November 08, 2026 — 17:23 PHT

Prompt/Request: "incorrect count, list shows 4, actual have 3"
Cause: the button counted archived records from every school year; the Archive shows one year at a time, and one archived student is in an older year.
Changes Made: new `frontend/src/features/archive/newestArchivedYear.ts` (`newestArchivedYear`, `rowsInNewestYear`). Both list buttons count `rowsInNewestYear(...)`. The Archive, opened with `state.section`, starts on the newest year with that section's records, so the count and the open tab match. Older years are still in the School year selector. The existing test's `Archive (4)` became `Archive (3)`, and the new test checks that the button's count equals the open tab's count.
Testing Performed: `npx vitest run` on archive, student-records and staff-records (128 passed); `tsc -b`; ESLint. Not checked in a browser.

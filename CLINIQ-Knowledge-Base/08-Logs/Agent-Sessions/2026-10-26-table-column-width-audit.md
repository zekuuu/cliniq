Date/Day/Time: Monday, October 26, 2026 — 00:14 PHT
Agent: Claude Code (Opus 5.5)
Task: Audit every table's column widths
Status: Completed
Prompt/Request: "Now also audit every other tables, like giving enough space for those who needs" (after the Inventory column-width changes in [2026-10-25-inventory-column-widths](2026-10-25-inventory-column-widths.md))
Files Modified:
- frontend/src/features/emergency-response/FollowUpListPage.tsx
- frontend/src/features/user-management/UserListPage.tsx
- frontend/src/features/dashboard/components/VisitCalendar.tsx (calendar Table view)
- frontend/src/features/student-records/IncompleteRecordsQueuePage.tsx
- frontend/src/features/reports/SportsReportListPage.tsx
- .claude/skills/cliniq-table-patterns/SKILL.md, CLINIQ-Knowledge-Base/04-Development/Skills-Setup.md, 08-Logs/Changelog.md
Changes Made:
- Measured all 13 tables in Chromium (Playwright, with a throwaway script in the session scratchpad, not the repo) at 1366px and 1920px. The script logged in with a stored session, opened each screen (the Visit and Incident logs set to All, the Calendar's Table view, the Dashboard Trends table, both Reports tabs, Users as the Admin), and per column checked whether any visible text ran onto a second line, whether any text was cut off with an ellipsis, and whether the table scrolled sideways.
- Follow-ups: LRN 9rem, Due date 8.5rem, Status 12rem, Actions 12.5rem; Reason takes the rest (it wrapped on 4 of 15 rows; now none).
- Users: Role 9rem, Status 7rem, Last login 11.5rem; a long Name was cut off at 1366px, now it isn't.
- Calendar Table view: Date 9rem, Visits 6rem, Incidents 7rem, Total 6rem (they were sharing equal widths with Events); Events wraps on 1 of 17 rows (a long list of event names), down from 2.
- Incomplete Records: Student 19% → 17%, Grade level 11% → 10%, Missing fields 25% → 23%, Resolution 16% → 21%. All columns can't fit on one line at 1366px (widest contents add up to about 998px in 975px), so the student name may wrap (the masked LRN already sits under it); badges, Resolution and Edit Record stay on one line.
- Sports Reports: Title 26% → 23%, Activity 17% → 15%, Requested by 14% → 15%, Students 8% → 7%, Last updated 13% (unchanged), Actions 22% → 23%; minTableWidth 66rem → 60rem. It no longer scrolls sideways at 1366px; Edit, Duplicate and Archive stay in one row (Archive used to drop to a second line); Activity and "date · time" wrap onto two lines and the title is shortened with an ellipsis.
- No change needed: Students, Visit Log, Incident Log, Audit Log, Reports (Incident register, Complaint summary). The Dashboard trend table scrolls sideways by design (time series with pinned columns).
- `cliniq-table-patterns` gains "Size columns by what they hold" and "Check at both desktop widths" (old: none → new: fitted rem widths for short columns, free text takes the rest, checked at 1366px and at the page cap), and its minTableWidth list now says Inventory 67rem and Sports Reports 60rem.
Reason: User request, extending the Inventory width fix to every table.
Testing Performed: `npx tsc -b` clean. `vitest run` on student-records, emergency-response, user-management, dashboard, reports, inventory: 199 passed, 2 failed (`IncompleteRecordsQueuePage.test.tsx` "edits a record from the queue…", `StudentProfilePage.test.tsx` "lists Staff the student's excused periods…"); both fail on clean `main` too. Screenshots checked for Incomplete Records and Sports Reports at 1366px.
Known Issues: Inventory still scrolls sideways (about 97px) at 1366px with the sidebar open: its minimum width (67rem) is larger than the 983px table there. Fitting it would squeeze the Item column below 6rem or need fewer or narrower action buttons.
Next Steps: Decide whether Inventory should fit at 1366px (for example, putting Restock inside the Manage menu).

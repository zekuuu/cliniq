# Decisions build, Part 4: reports and calendar

Date/Day/Time: Friday, October 30, 2026 — 00:26 PHT
Agent: Claude Code (Opus 5.5)
Task: Build Part 4 of the decisions-sheet answers (ADR-050): four `FIX` entries.
Status: Completed
Prompt/Request: The same "Build the fixes that came out of the decisions sheet" prompt, "Parts 1 to 6", on the branch `build/decisions-sheet-answers-oct29`. Part 4: complaints grouped by a clean list, a weekly breakdown on the Monthly Report, a monthly inventory print, the Calendar renamed Activity calendar. Defaults D15 to D18 apply.

Files Modified:
- Data layer: `frontend/src/lib/mock-db/api.ts` (`complaintCounts` groups with `reportComplaint`; `MonthlyReportData.weeklyComplaints` and `inventory`; `MonthlyInventoryRow`), `frontend/src/lib/complaints.ts` (`complaintGroupKey`, `reportComplaint`), `frontend/src/lib/dates.ts` (`monthWeeks`)
- UI: `features/reports/ReportsPage.tsx` (weekly table, Inventory sheet tab), new `features/reports/components/MonthlyTables.tsx`, `components/ReportsPrint.tsx` (weekly table on the Monthly Report printout, new "Monthly Inventory" document); `features/inventory/InventoryListPage.tsx` ("Monthly inventory sheet" link); `layouts/navigation.ts`, `features/dashboard/CalendarPage.tsx`, `components/VisitCalendar.tsx`, `routes/AppRoutes.tsx` (Activity calendar)
- Tests: new `features/reports/ReportsDecisions.test.tsx` (7 tests); `CalendarPage.test.tsx` and `SportsReport.test.tsx` (new name, new tab)
- Docs and skills: `Module-Overview.md`, `Screen-Inventory.md`, `.claude/skills/cliniq-print-patterns/SKILL.md` (lists the Inventory sheet among the Reports printouts), `Skills-Setup.md`, ADR-050 status line, Changelog, Issues-and-TODOs, Issues-Done-Archive

Changes Made:
- **What Reports did before (D15).** Saving already stored a complaint in a known suggestion's spelling when it matched case-insensitively after collapsing spaces, so "headache" and "Headache" counted together. Reports then counted the stored text exactly, so "Headache." or "head ache" counted apart. **Now** reports group by a key that ignores case, all spacing and trailing punctuation, matched to the complaint types; an unmatched complaint keeps its own cleaned text. Only the grouping changed: no stored complaint is rewritten and there is no merge screen. The Complaint summary and the stored Reports use the same grouping.
- **Weekly breakdown (D16).** `monthWeeks`: Monday-start weeks clipped to the month, so a Saturday and Sunday count in the week before them. A month that starts on a weekend joins those days to the first week. A last week of three weekdays or fewer joins the week before it (September 2026: 1-4, 7-11, 14-18, 21-30). Labels run from the week's first day to its last weekday, as the paper report does. "Clinic visits by complaint and week" with a Total column and an "All complaints" row, on the Monthly Report screen (the table scrolls with the complaint column pinned) and in its A4 printout. "Short" was not defined; three weekdays or fewer is my reading of the clinic's example (its last week had three).
- **Monthly inventory sheet (D17).** A new "Inventory sheet" tab on Reports and its A4 document "Monthly Inventory — <month>" (Item, Unit, New Purchase, Total Available, Ending Inventory, a note, Prepared by). Ending Inventory is today's stock wound back over the movements after the month; Total Available is the stock at the month's start plus New Purchase. Nothing is stored. Printing is audited like every print (`PrintDocument`). The Inventory screen links to it.
- **Activity calendar (D18).** The sidebar item, page title (h1), route title and the calendar card heading. The route `/calendar` and the code names are unchanged; there is no breadcrumb or shortcut entry naming it.

Reason: ADR-050 items 3, 4 and 6, and the four Part 4 `FIX` entries of "Decisions sheet answers".

Testing Performed:
- Typecheck pass, build pass, lint unchanged from the baseline (1 error, 2 warnings, pre-existing).
- Tests: 13 failed and 777 passed of 790. They are the 12 baseline failures and the date-dependent seed test logged in Part 3. `SportsReport.test.tsx` failed once because it listed the Reports tabs; it now includes "Inventory sheet".
- Screens (Playwright Chromium headless shell, screenshots outside the repository): Reports Monthly and Inventory sheet (Staff and Admin), Inventory, Activity calendar (Staff and Admin), at 1440, 768 and 390 px. At 390 px the weekly table first widened the page by 318 px; fixed with `min-w-0` on its grid item, re-checked with no horizontal scroll. axe-core: no violations.

Known Issues: none new.

Next Steps: Part 5 (clinic settings and rules).

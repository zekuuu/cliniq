Date/Day/Time: Sunday, November 08, 2026 — 18:45 PHT (clock read with PowerShell `Get-Date`; Git Bash's `TZ=Asia/Manila date` printed UTC in this environment, so the set-up stamp "10:28 PHT" taken with it was really 18:28 PHT)
Agent: Claude Code (Opus 5.5)
Task: The Admin's Reports page: a Report month drop-down, the list of the monthly reports, and a view-only paper-style sheet (ADR-077)
Status: Completed
Prompt/Request: Zean, Sunday, November 8, 2026 (chat), from `Prompt-Frontend-Admin-Reports-Month-List-View-Only` (pasted): "the Admin sees a 'Report month' drop-down, then the list of that month's reports … Opening a report shows a PDF-style view, view only: no Print, no Save as PDF, no export for the Admin … Everything else on the Reports page is hidden from the Admin. Staff keep the page exactly as it is." On main, no commit and no push. Zean's pop-up answers: run this prompt and then Staff idle sign-out Part 1 in the same session; on privacy, "do the best, and keep what we currently have like in printing does".
Files Modified:
- `frontend/src/features/reports/AdminReportsPage.tsx` (new), `frontend/src/features/reports/AdminReportsPage.test.tsx` (new)
- `frontend/src/features/reports/components/ReportsPrint.tsx` (`readOnly`), `frontend/src/components/print/Print.tsx` (`PrintDocument` `onScreen`, shared `DocumentBody`), `frontend/src/components/ui/BackButton.tsx` ("Back to …" label with `onBack`)
- `frontend/src/features/reports/api/reportsApi.ts` (`fetchReportMonthSetup`), `frontend/src/lib/mock-db/api.ts` (`getLatestRecordedMonth`, `getSchoolYearHistory`)
- `frontend/src/routes/AppRoutes.tsx` (Admin route and redirect), `frontend/src/routes/AppRoutes.test.tsx`, `frontend/src/features/reports/SportsReport.test.tsx`, `frontend/src/features/staff-counts.test.tsx` (lazy-route timeout)
- `CLINIQ-Knowledge-Base/06-Decisions/ADR-077-Admin-Reports-Month-List-View-Only.md` (new), `ADR-074` (dated note), `Decisions-Summary.md`, `01-Requirements/User-Roles-and-Permissions.md`, `03-Design/Screen-Inventory.md` (#21b), `04-Development/Keyboard-Shortcuts-and-Efficiency.md`, `04-Development/Audit-Coverage.md`, `08-Logs/Frontend-Changelog.md`, `08-Logs/Frontend-Issues-and-TODOs.md`, `08-Logs/Issues-Done-Archive.md`
Changes Made:

**Set-up.** Branch `main`, starting commit `bc33132`, clean tree, `git pull --ff-only` already up to date. ADR numbers: `backend` already holds ADR-076 (Staff record reviews), so this is ADR-077. The idle sign-out ADR (Part 1, next in this session) takes ADR-078, and the clinic-PC-only ADR (Part 2) takes ADR-079. A parallel backend-docs session in the `D:\zeank\Desktop\Projects\cliniq-backend` worktree was told the same numbers and edits no ADR and no `Decisions-Summary.md`.

**Step 1: what the Admin could reach on Reports before this change** (`ReportsPage.tsx`, `AppRoutes.tsx`, `navigation.ts`):
1. The page heading "Reports" with "Generate, review, and print clinic reports for administrative review."
2. **Print / Save as PDF**, shown but unavailable, with the tooltip "Printing is done by the clinician." (ADR-038).
3. The **Report type** tabs: Monthly Report, Incident register, Symptom summary, Inventory sheet.
4. The **Report month** `MonthPicker` (any month, a calendar popover).
5. Monthly Report: three stat cards, Clinic visits by sex, and the weekly complaints table.
6. Incident register: a sortable table (LRN or Staff No., Date, Symptom, Status) with an **Open report** link per row to the Incident Report.
7. Symptom summary: a Chart/Table switch, the bar chart and a sortable table.
8. Inventory sheet: the table.
9. Router state from the Dashboard could open a given tab and month.
10. Not reachable: the Sports Reports button (hidden for the Admin), and the `/reports/sports…` routes (redirected to the Dashboard). The browser's own print printed only "Printing is done by the clinician."

**What remains for the Admin:** the heading and help line, the Report month drop-down, the list of the four reports with Open, and the view-only sheet with Back to list. Items 2 to 9 are gone for the Admin; Staff keep all of them unchanged.

**Step 3: privacy check per monthly report** (no student name in any of them):
- **Monthly Report:** aggregates, plus an Incidents table, one row per incident: LRN or Staff No., date and time, complaint text, and stage. The printout shows the full LRN (ADR-044).
- **Incident register:** the same per-incident rows.
- **Symptom summary:** aggregates only.
- **Inventory sheet:** item aggregates only (no person).
- **Decision (pop-up, Zean):** keep what the printout shows rather than counts only. Applied with the screen rule: the Admin's on-screen sheet shows the **masked** LRN (ADR-040 item 2, ADR-044's amendment keeps the Reports screen masked). The full LRN stays on Staff's paper. The "Prepared by" name is left blank on the Admin's sheet; the clinician who prints it signs it.
- **Data layer:** `getMonthlyReport` returns each incident record with the full LRN to the browser, and the screen masks it. This was already the case for Staff and the Admin. Noted for the backend below.

**Steps 2 and 5: the page.** `/reports` renders `AdminReportsPage` for the Admin and `ReportsPage` for Staff, so the Admin's menu keeps its one Reports entry. The drop-down is the shared `Select` (cliniq-dropdown-patterns), not a native `select` as the prompt said. The skill puts every dropdown on the shared, keyboard-operable primitive with a visible label, which meets the prompt's purpose. Earlier school years are shown as a label suffix, "May 2026 (2025–2026)", because the shared Select has no option groups. Months: the current school year from its recorded start up to this month, newest first, then each earlier recorded year. The page opens on the latest month with a visit or an incident. An empty month shows "No visits recorded this month". The sheet is `ReportsPrint` with `readOnly`: `PrintDocument onScreen` draws the same letterhead, title, scope and sections in place on a white A4 sheet, so the figures come from one component. The tab title is "CLINIQ <report>, <Month Year>" while a sheet is open.

**Step 4: guards.** Any `/reports/<something>` route the Admin may not open now redirects to `/reports`, not `/`. Today that means the Sports Report list, new, view and edit routes. The mock already refuses `listSportsReports`, `getSportsReport`, `getSportsReportContent` and every Sports Report write for the Admin (`SportsReportPermissionError`); tests added. `getMonthlyReport` stays open to both roles (aggregates and masked-on-screen rows). The new `getSchoolYearHistory` is a read of the settings and recorded starts, with no write.

**Step 6: audit.** Staff opening a report writes no entry (ADR-048 logs profiles and incident reports only), so the Admin's opening writes none. `Audit-Coverage.md` says so.

**Tests changed for the decision, not weakened:**
- `AppRoutes.test.tsx`: `/reports/sports` moved out of the "redirect to the Dashboard" list into a new test that expects `/reports`.
- `SportsReport.test.tsx`: the Admin's redirect target is `/reports`, and the Admin sees the four reports as Open buttons instead of tabs.
- `staff-counts.test.tsx`: its lazy-route `findByRole` gets the same 5 s that `AppRoutes.test.tsx` uses. It failed once in about five runs, on the lazy chunk's first import under the parallel suite. The assertion is unchanged.

Reason: Zean's decision (ADR-077). The Admin reads the monthly reports and nothing else on Reports; printing stays with the clinician (ADR-038).
Testing Performed:
- Before: typecheck 0 errors; lint 0 errors, 1 warning (`ErrorSummary.tsx`, existing); tests 1143 of 1143 (131 files).
- After: typecheck 0; lint 0 errors, the same 1 warning; tests 1158 of 1158 three times in a row (132 files), after the `staff-counts` timeout fix. One earlier run had that one lazy-route timeout. Build passes.
- New tests (`features/reports/AdminReportsPage.test.tsx`): shows only the Report month drop-down and the four monthly reports; defaults to the latest month with records; offers the current school year newest first, then the earlier recorded year labelled with its year; changes the list with the month; shows an honest empty state for a month with no visits; opens a report as a view-only page with Back to list, and returns focus to its Open button; shows the same figures Staff print for the month; names no student and shows no full LRN in any report (masked LRNs only); keeps tab order: drop-down, then each Open; Enter opens; lets the Admin read the aggregate monthly report; refuses every Sports Report read for the Admin. `routes/AppRoutes.test.tsx`: redirects the Admin from each of the four Staff-only report routes to the Admin Reports page; keeps the Staff Reports page for Staff.
- Browser (system Chrome through playwright-core and axe-core from an earlier session's scratchpad, not the repo; no Edge): axe (wcag2a, wcag2aa, wcag21aa) at 375, 768 and 1280 on Staff's Reports, the Admin's list and each of the four Admin sheets found no violations and no horizontal page scroll. Keyboard walk at 1280: the drop-down, then Open ×4, then the sidebar; Enter opens, focus lands on Back to list, and Enter returns to the list with focus on the used Open. `/reports/sports` as the Admin lands on `/reports`. Tab titles were "CLINIQ Monthly Report, November 2026" and the like. Screenshots: `C:\Users\zeank\AppData\Local\Temp\claude\215c8086454e59e6\98563800-c113-4947-b879-478a3a9097c3\scratchpad\shots\` (`admin-reports-list-*.png`, `admin-view-*-*.png`, `staff-reports-*.png`).
Known Issues: None new. Prettier reports `src/lib/mock-db/api.ts`, `src/routes/AppRoutes.test.tsx` and `src/features/reports/SportsReport.test.tsx` as unformatted; they were already unformatted at `bc33132`, so they were left as they are.
Next Steps: Canonical documents (DOC entry logged). Staff idle sign-out, Part 1 (ADR-078), follows in this session.

## For the backend branch

- **What the Admin may call:** `GET` the monthly report for a month (the aggregate report: counts, by sex, weekly complaints, dispositions, follow-ups by status, items given, inventory sheet, and the incident rows). For the Admin, return each incident's student number **masked**, or the LRN's last four digits only. The screen shows nothing more, and today's mock sends the full LRN to the browser. Also allowed: reading the school-year settings with the recorded starts (`schoolYearStarts`) and the latest month with records. A small `GET` is enough, or derive it on the client.
- **What must refuse the Admin (403):** every Sports Report endpoint (list, read, content, create, update, duplicate, archive and restore). Any other Staff-only report endpoint added later must do the same.
- **No print endpoint:** the Admin's view is on screen only and needs none. Printing (and its `print` audit entry) stays Staff only.
- **No audit entry** for opening a report, for either role (unchanged).

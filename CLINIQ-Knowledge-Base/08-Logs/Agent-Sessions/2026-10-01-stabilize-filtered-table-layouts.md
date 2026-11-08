Date/Day/Time: Thursday, October 01, 2026 — 07:33 PHT
Agent: Codex
Task: Stabilize table columns when changing grade levels and other filters, and remove visible table-name captions.
Status: Completed
Prompt/Request: “Changing between grade levels also change the positions of columns, so every time I change it the table moves, it should be fixed. Then also apply it to other tables that might have filtering that changes contents of the table. Then also remove the table name Student masterlist as well as remove it to other tables.”
Files Modified:
- frontend/src/components/ui/DataTable.tsx
- frontend/src/features/student-records/StudentListPage.tsx
- frontend/src/features/student-records/StudentListPage.test.tsx
- frontend/src/features/student-records/IncompleteRecordsQueuePage.tsx
- frontend/src/features/clinic-visits/VisitLogListPage.tsx
- frontend/src/features/emergency-response/FollowUpListPage.tsx
- frontend/src/features/emergency-response/IncidentLogListPage.tsx
- frontend/src/features/inventory/InventoryListPage.tsx
- frontend/src/features/audit-log/AuditLogPage.tsx
- frontend/src/features/reports/ReportsPage.tsx
- frontend/src/features/reports/components/HealthSummary.tsx
- frontend/src/features/dashboard/components/ComplaintTrends.tsx
- frontend/src/features/dashboard/components/VisitCalendar.tsx
- frontend/src/features/user-management/UserListPage.tsx
- CLINIQ-Knowledge-Base/08-Logs/Frontend-Issues-and-TODOs.md
- CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md
Changes Made:
- Added an opt-in fixed table layout and column-width support to the shared DataTable.
- Applied the fixed layout to every current DataTable, covering filter, search, date-range, pagination, report-period, and dashboard-derived table contents.
- Assigned explicit widths to the Student List columns so changing grade levels cannot redistribute the table.
- Made captions screen-reader-only by default; captions remain available as accessible table names but no longer render as visible “Student masterlist” or other table labels.
- Added a regression assertion for the Student List fixed layout and width contract.
Reason: Filtered rows can have different text lengths and badge content, which makes an auto-layout table shift its column positions between selections. The shared table is the right boundary for preserving alignment consistently while keeping captions accessible.
Testing Performed:
- npm.cmd test -- src/features/student-records/StudentListPage.test.tsx --reporter=dot — 1 file, 4 tests passed.
- npm.cmd test -- --reporter=dot — 41 files, 195 tests passed.
- npm.cmd run typecheck — passed.
- npm.cmd run lint — passed with one pre-existing Fast Refresh warning in `src/components/forms/FollowUpPrompt.tsx`.
- npm.cmd run build — passed.
Known Issues: The generic fixed layout uses equal-width columns where a table does not declare explicit widths; the Student List declares its calibrated widths.
Next Steps: Run the complete frontend test, typecheck, lint, and build commands.

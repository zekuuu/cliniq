Date/Day/Time: Monday, September 28, 2026 — 09:09
Agent: Codex
Task: Add visit-log date presets and sortable columns
Status: Completed
Prompt/Request: "The visit log list should also have certain filtering, like today, this week, this month, all, or custom, not just the custom, then for certain columns there should be a up or down arrow indicating to sort them such as for date and time, student number, record, and disposition, but date and time is default"
Files Modified:
- cliniq-frontend/src/features/clinic-visits/VisitLogListPage.tsx
- cliniq-frontend/src/features/clinic-visits/VisitLogListPage.test.tsx
- cliniq-frontend/src/features/clinic-visits/api/visitLogApi.ts
- cliniq-frontend/src/components/ui/DataTable.tsx
- cliniq-frontend/src/components/ui/DateRangePicker.tsx
- cliniq-frontend/src/components/index.ts
- cliniq-frontend/src/lib/dateRange.ts
- CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md
Changes Made:
- Replaced the standalone date inputs with the shared accessible date-range picker, scoped to Today, Last 7 days (this week), This month, All, and Custom range. All visits is the initial range; a custom range is applied only after confirmation.
- Added generic sortable table-header support with visible direction arrows, keyboard-operable buttons, and `aria-sort` for the active column.
- Added visit-log sorting for Date and time, Student Number, Record, and Disposition. Date and time defaults to descending (newest first); clicking a header toggles ascending/descending.
- Preserved the multi-student privacy boundary: the list continues to show Student Numbers rather than student names.
Reason: The owner requested faster period filtering and explicit ordering controls for the Visit Log List.
Testing Performed:
- `npm.cmd test -- VisitLogListPage.test.tsx` — passed (6 tests).
- `npx.cmd eslint` against the modified visit-log, date-range, and table files — passed.
- Project-wide typecheck was attempted but remains blocked by unrelated in-progress errors in `NewVisitEntryPage.tsx` (`complaintTypes` is missing) and project-wide lint remains blocked by unrelated unused-variable errors in `HealthSummary.tsx` and `mock-db/seed.ts`.
Known Issues:
- No new visit-log issues found. The broader typecheck/lint failures above pre-date and are outside this change's scope.
Next Steps: Include the controls in the next browser-level visual/a11y audit of the Visit Log List.

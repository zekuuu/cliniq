Date/Day/Time: Monday, September 28, 2026 — 10:42
Agent: Codex
Task: Prevent Visit Log custom date-range layout reflow
Status: Completed
Prompt/Request: "The layout breaks when choosing the custom range because it adjust everything when it should just pop up on top. Also make All the default"
Files Modified:
- cliniq-frontend/src/components/ui/DateRangePicker.tsx
- cliniq-frontend/src/features/clinic-visits/VisitLogListPage.tsx
- cliniq-frontend/src/features/clinic-visits/VisitLogListPage.test.tsx
- CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md
Changes Made:
- Added an opt-in `customPopover` mode to the shared DateRangePicker. Its Custom range form is absolutely positioned beneath the trigger and above surrounding content instead of participating in the page layout.
- Enabled that mode for Visit Log List only, preserving other uses of the shared date picker.
- Confirmed that All remains the Visit Log’s default date range and added a regression assertion for both default selection and popover positioning.
Reason: The custom-date form previously used inline layout space on the Visit Log, which shifted the table and surrounding controls.
Testing Performed:
- `npm.cmd test -- VisitLogListPage.test.tsx` — passed (6 tests).
- `npx.cmd eslint src/features/clinic-visits/VisitLogListPage.tsx src/features/clinic-visits/VisitLogListPage.test.tsx src/components/ui/DateRangePicker.tsx` — passed.
Known Issues:
- No new issues found.
Next Steps: Include the popover in the next browser-level responsive check of the Visit Log.

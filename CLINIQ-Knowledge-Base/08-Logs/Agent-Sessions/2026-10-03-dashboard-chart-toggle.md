Date/Day/Time: Saturday, October 03, 2026 — 02:20 PHT
Agent: Codex
Task: Restore the Dashboard Visits Trend Chart/Table toggle for one-period date ranges.
Status: Completed
Prompt/Request: “Now I cannot click on the Chart button.”
Files Modified:
- frontend/src/features/dashboard/components/ComplaintTrends.tsx
- frontend/src/features/dashboard/components/ComplaintTrends.test.tsx
- CLINIQ-Knowledge-Base/04-Development/Frontend-Loop-Engineering.md
- CLINIQ-Knowledge-Base/08-Logs/Frontend-Issues-and-TODOs.md
- CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md
Changes Made:
- Removed the implicit `tooFewBuckets` table override; `showTable` now follows the selected view only.
- Kept the one-period informational notice, but Chart remains selectable and renders its single data point.
- Added regression coverage that starts on Chart, switches to Table, and verifies the period column.
Reason: The prior stacking-state fix made the automatic table fallback selected and unreachable from Chart. The explicit segmented control must remain interactive.
Testing Performed:
- Focused Vitest: 2 files, 21 tests passed.
- Typecheck passed.
- Focused ESLint passed.
Known Issues: A one-period chart cannot show a comparison trend; the notice explains that limitation.
Next Steps: None.

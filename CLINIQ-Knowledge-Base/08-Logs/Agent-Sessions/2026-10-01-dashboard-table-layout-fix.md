Date/Day/Time: Thursday, October 01, 2026 — 08:31 PHT
Agent: Codex
Task: Fix the major Dashboard layout break shown in the complaint-trend table.
Status: Completed
Prompt/Request: “There is a major layout break here” with a Dashboard screenshot showing the Visits trend table's period headers and values overlapping.
Files Modified:
- `frontend/src/features/dashboard/components/ComplaintTrends.tsx`
- `frontend/src/features/dashboard/DashboardPage.test.tsx`
- `CLINIQ-Knowledge-Base/08-Logs/Frontend-Issues-and-TODOs.md`
- `CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md`
Changes Made:
- Kept the shared fixed-layout DataTable and assigned explicit widths to the complaint, period, and total columns.
- Added an intrinsic minimum width to this time-series table so it overflows inside the existing keyboard-focusable horizontal scroller instead of compressing every period into the card width.
- Added a regression assertion for the fixed layout, scroll-width class, and calibrated column widths.
Reason: The recent fixed-layout table change stabilized ordinary filtered tables but exposed a special case in the Dashboard trend fallback: its many period columns cannot fit simultaneously in the card at their readable size.
Testing Performed:
- DashboardPage test: 12 tests passed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed with one existing Fast Refresh warning in `src/components/forms/FollowUpPrompt.tsx`.
- `npm.cmd run build`: passed.
- Full frontend test suite was run; existing React `act(...)` warnings appeared in Follow-Up tests.
Known Issues: None introduced by this change.
Next Steps: None.

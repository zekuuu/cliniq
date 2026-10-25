Date/Day/Time: Monday, October 26, 2026 — 01:04 PHT
Agent: Claude Code (Opus 5.5)
Task: Dashboard Trends: fixed-width, centered Sex / Grade level filter buttons
Status: Completed
Prompt/Request: (screenshot of the Female / Male buttons stretched across the card) "weird width, maybe set a fixed width then center it"
Files Modified:
- frontend/src/features/dashboard/components/ComplaintTrends.tsx
- frontend/src/features/dashboard/components/ComplaintTrends.test.tsx
- CLINIQ-Knowledge-Base/08-Logs/Changelog.md
Changes Made:
- The Sex and Grade level buttons under the chart were a stretched grid (2 columns, or 2/3/4 for grades) across the full-width card. Now each button is 12rem wide (`sm:w-48`) in a centered, wrapping row (`FILTER_ROW`); on phones each takes half the row. Applied to the Grade level buttons too, which had the same stretch.
Reason: User request.
Testing Performed: Screenshots in Chromium at 1366px (Sex and Grade level) and 390px (Sex): buttons fixed-width and centered, two per row on the phone. `npx tsc -b` clean; `vitest run src/features/dashboard` 54/54 after updating the ComplaintTrends test that asserted the old four-column grade grid (now asserts `sm:w-48` and a centered flex row).
Known Issues: None.
Next Steps: None.

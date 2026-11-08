Date/Day/Time: Thursday, October 1, 2026 — 23:33:54 PHT
Agent: Codex
Task: Place the Dashboard View all affordance properly.
Status: Completed
Prompt/Request: Correct the visible View all placement shown in the Dashboard screenshot.
Files Modified: `frontend/src/components/ui/ViewAllLink.tsx`, `CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md`.
Changes Made: Added `whitespace-nowrap` to the shared ViewAllLink so StatCard header links remain a single, clearly readable affordance instead of wrapping inside narrow cards.
Reason: The screenshot showed “View all” breaking across two lines in stat-card headers.
Testing Performed: `npm.cmd test -- DashboardPage.test.tsx` passed (16 tests).
Known Issues: None identified.
Next Steps: None.

Date/Day/Time: Thursday, October 1, 2026 — 23:44:27 PHT
Agent: Codex
Task: Place the Dashboard View all affordances correctly.
Status: Completed
Prompt/Request: Correct the View all placement shown in the Dashboard screenshot.
Files Modified: `frontend/src/components/ui/Card.tsx`, `CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md`.
Changes Made: Made the CardHeader title block flexible and the actions block non-shrinking so list-widget actions remain top-right beside the title/description instead of wrapping below the header.
Reason: Follow-Ups and Inventory View all links were appearing on a separate line below their descriptions.
Testing Performed: `npm.cmd run typecheck` passed; `npm.cmd test -- DashboardPage.test.tsx` passed (16 tests).
Known Issues: None identified.
Next Steps: None.

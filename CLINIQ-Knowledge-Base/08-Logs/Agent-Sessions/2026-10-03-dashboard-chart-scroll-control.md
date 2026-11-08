# Dashboard Chart control while scrolling

Date/Day/Time: Saturday, October 03, 2026 — 03:07 PHT
Agent: Codex
Task: Fix the Dashboard Visits Trend Chart button after the sticky top-bar/table layering fix.
Status: Completed
Prompt/Request: “Now I cannot click on the Chart button.”
Files Modified: `frontend/src/features/dashboard/components/ComplaintTrends.tsx`, `frontend/src/features/dashboard/components/ComplaintTrends.test.tsx`, `CLINIQ-Knowledge-Base/04-Development/Frontend-Loop-Engineering.md`, `CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md`, `CLINIQ-Knowledge-Base/08-Logs/Frontend-Issues-and-TODOs.md`
Changes Made: Kept the trend view value bound directly to the Chart/Table state, retained an explicit state update handler, and made the Visits Trend card header sticky at `top-16` with a lower z-index than the AppShell header. Added a regression test that switches Table back to Chart.
Reason: The control could be covered by the sticky AppShell bar after scrolling. Keeping the trend controls directly below that bar preserves the top-bar/table layering fix while leaving Chart clickable.
Testing Performed: Focused dashboard/trend/AppShell tests passed (32 tests). Production typecheck and build passed. The full suite was attempted; it still has an unrelated `AppRoutes.test.tsx` Student List heading timeout.
Known Issues: Full-suite AppRoutes Student List timeout remains unrelated to this change.
Next Steps: Re-run the full suite after the existing AppRoutes test fixture/timing issue is addressed.

Date/Day/Time: Monday, September 28, 2026 — 22:44
Agent: Codex
Task: Make browser tab titles route-aware.
Status: Completed
Prompt/Request: "fix tab title too, must depend on what current page"
Files Modified:
- frontend/src/routes/AppRoutes.tsx
- frontend/src/routes/AppRoutes.test.tsx
- CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md
- CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-09-28-route-tab-titles.md
Changes Made: Added a title to every route and a small route wrapper that updates `document.title` to `CLINIQ — <current page>`. Added a test confirming the tab title updates during sidebar navigation.
Reason: The static HTML title always reported Clinic Overview, even when the user was working elsewhere.
Testing Performed: `npm.cmd test -- AppRoutes.test.tsx` (8 passed); `npm.cmd run typecheck` (passed).
Known Issues: None.
Next Steps: None.

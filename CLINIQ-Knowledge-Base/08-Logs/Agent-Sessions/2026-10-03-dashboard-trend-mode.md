Date/Day/Time: Saturday, October 03, 2026 — 02:02 PHT
Agent: Codex
Task: Fix the Dashboard Visits Trend mode mismatch when the selected date range contains only one period.
Status: Completed
Prompt/Request: “There's still bugs, fix it.” Follow-up clarification: “The frequent visit bug was a mistake since date is this month.”
Files Modified:
- frontend/src/features/dashboard/components/ComplaintTrends.tsx
- frontend/src/features/dashboard/components/ComplaintTrends.test.tsx
- CLINIQ-Knowledge-Base/04-Development/Frontend-Loop-Engineering.md
- CLINIQ-Knowledge-Base/08-Logs/Frontend-Issues-and-TODOs.md
- CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md
Changes Made:
- Kept the Dashboard’s intentional This month default and left the empty frequent-visitor state unchanged.
- When one period forces the table fallback, the “Show trend as” segmented control now marks Table selected instead of leaving Chart selected.
- Added a regression test covering the automatic single-period fallback and its period header.
Reason: The screenshot showed the component rendering the table while the Chart control remained selected, making the UI state contradictory.
Testing Performed:
- Focused Vitest: 2 files, 21 tests passed.
- Typecheck passed.
- Production build passed.
- `git diff --check` passed.
Known Issues: The frequent-visitor card can be empty for a sparse This month range by design.
Next Steps: None.

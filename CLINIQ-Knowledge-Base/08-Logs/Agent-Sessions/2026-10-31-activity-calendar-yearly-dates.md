# Activity calendar yearly dates

Date/Day/Time: Saturday, October 31, 2026 — 12:51 PHT
Agent: Codex
Task: Improve date legibility in the Activity calendar's yearly view.
Status: Completed
Prompt/Request: "Then in yearly, make calendars bigger, like I can see the dates maybe muted numbers or what, do what's best"
Files Modified: `frontend/src/features/dashboard/components/VisitCalendar.tsx`, `frontend/src/features/dashboard/CalendarPage.test.tsx`, `CLINIQ-Knowledge-Base/03-Design/Design-System.md`, `CLINIQ-Knowledge-Base/08-Logs/Changelog.md`, this session log.
Changes Made: Enlarged yearly mini-calendar squares from 12px to 20px, added visible day numbers with the existing heat colors and marker borders, and updated the loading skeleton to match. Added a regression test for readable January day numbers.
Reason: The previous yearly view was a tiny color-only heatmap, so users could not reliably identify dates. Numbers now provide the primary date cue, with color and outlines remaining supplementary activity markers.
Testing Performed: Focused Activity calendar and holiday tests: 11 passed. Typecheck and production build pending at the time this entry was written.
Known Issues: None found.
Next Steps: None.

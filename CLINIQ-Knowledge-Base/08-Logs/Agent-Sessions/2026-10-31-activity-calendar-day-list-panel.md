# Activity calendar day-list panel

Date/Day/Time: Saturday, October 31, 2026 — 12:55 PHT
Agent: Codex
Task: Improve the yearly Activity calendar's expanded active-day list.
Status: Completed
Prompt/Request: "When opening Show day list (119 days) it floods the screen, i'm thinking to remove it or if possible improve it"
Files Modified: `frontend/src/features/dashboard/components/VisitCalendar.tsx`, `frontend/src/features/dashboard/CalendarPage.test.tsx`, `CLINIQ-Knowledge-Base/03-Design/Design-System.md`, `CLINIQ-Knowledge-Base/08-Logs/Changelog.md`, this session log.
Changes Made: Kept the full list but placed it in a capped `max-h-80` scroll panel with a visible surface, border, scroll padding, and keyboard focus. Print mode removes the cap and restores the full list. Added a regression test for the panel's focusability and scroll classes.
Reason: Removing the list would hide useful date-level details. Containing it preserves access to all entries without pushing the yearly calendar far below the fold.
Testing Performed: Focused Activity calendar and holiday tests: 12 passed. Typecheck and production build passed.
Known Issues: None found.
Next Steps: None.

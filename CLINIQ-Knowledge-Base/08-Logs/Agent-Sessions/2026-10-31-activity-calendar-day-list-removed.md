# Activity calendar day list removed

Date/Day/Time: Saturday, October 31, 2026 — 12:56 PHT
Agent: Codex
Task: Simplify the yearly Activity calendar after the expanded day list remained difficult to read.
Status: Completed
Prompt/Request: "still not readable, maybe remove it instead"
Files Modified: `frontend/src/features/dashboard/components/VisitCalendar.tsx`, `frontend/src/features/dashboard/CalendarPage.test.tsx`, `CLINIQ-Knowledge-Base/03-Design/Design-System.md`, `CLINIQ-Knowledge-Base/08-Logs/Changelog.md`, this session log.
Changes Made: Removed the yearly "Show day list" control and its expanded list. The yearly view now reports how many active days are marked in the mini-calendars and directs users to Table view for full date, count, event, and holiday details.
Reason: The long inline list remained visually dense even inside a scroll panel. Removing it keeps the yearly overview readable and leaves detailed rows in the view designed for tabular inspection.
Testing Performed: Focused Activity calendar and holiday tests, typecheck, and production build pending after this final simplification.
Known Issues: None found.
Next Steps: None.

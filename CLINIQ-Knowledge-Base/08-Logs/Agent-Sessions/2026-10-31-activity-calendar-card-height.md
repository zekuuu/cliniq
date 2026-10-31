# Activity calendar card height

Date/Day/Time: Saturday, October 31, 2026 — 12:48 PHT
Agent: Codex
Task: Keep Activity calendar date cards the same size regardless of event content.
Status: Completed
Prompt/Request: "in activity calendar, make all dates cards same size regardless of with or without events"
Files Modified: `frontend/src/features/dashboard/components/VisitCalendar.tsx`, `frontend/src/features/dashboard/CalendarPage.test.tsx`, `CLINIQ-Knowledge-Base/03-Design/Design-System.md`, `CLINIQ-Knowledge-Base/08-Logs/Changelog.md`, this session log.
Changes Made: Fixed monthly calendar date cards and their loading skeletons to 6rem with overflow containment; added a regression test covering every rendered date cell.
Reason: Event chips could expand table rows beyond the nominal height, making dates with labels larger than empty dates. A fixed card height preserves the calendar grid rhythm while the accessible day description and chip titles retain the full information.
Testing Performed: Focused Activity calendar and holiday tests: 10 passed. Typecheck and production build pending at the time this entry was written.
Known Issues: None found.
Next Steps: None.

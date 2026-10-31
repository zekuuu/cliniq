# Activity calendar event indicator

Date/Day/Time: Saturday, October 31, 2026 — 12:52 PHT
Agent: Codex
Task: Improve the event indicator on yearly Activity calendar dates.
Status: Completed
Prompt/Request: "Then improve the has event indicator in dates, currently it's just a black outline, change it to something better but not so distracting"
Files Modified: `frontend/src/features/dashboard/components/VisitCalendar.tsx`, `CLINIQ-Knowledge-Base/03-Design/Design-System.md`, `CLINIQ-Knowledge-Base/08-Logs/Changelog.md`, this session log.
Changes Made: Replaced the yearly mini-calendar's black event outline with the restrained `brand-yellow-dark` outline already associated with event chips. The outline remains a non-filled marker, so heat intensity and date numbers stay readable.
Reason: The black border was visually heavy and could be mistaken for a structural edge. A thin brand-yellow edge connects the marker to the existing event language without adding a distracting badge or fill.
Testing Performed: The prior focused yearly calendar tests passed (11 tests); typecheck and production build passed before this indicator-only styling adjustment.
Known Issues: None found.
Next Steps: None.

Date/Day/Time: Thursday, November 05, 2026 — 22:12 PHT
Agent: Claude Code (Opus 5.5)
Task: Make holidays visible on the yearly calendar
Status: Completed
Prompt/Request: "Yearly Calendar, still not visible holiday, maybe still implement the stripe but more visible or what can we do"
Files Modified:
- frontend/src/features/dashboard/lib/calendar.ts (new `yearHolidayClass`)
- frontend/src/features/dashboard/components/VisitCalendar.tsx
Changes Made:
- Cause: in the yearly grid a holiday showed only as the tan fill on a day with no visits; any visit's green shade or an event's yellow covered it, and the no-class stripes used the light border grey (#e0e0e0) on tan, which barely shows.
- Every holiday square in the yearly grid now carries grey stripes (text-muted #9e9e9e, 1px every 4px) drawn over whatever fill it has (tan, green activity shade or event yellow), and a grey border unless it is today (green ring) or an event day (yellow edge). A holiday with no activity keeps the tan fill under the stripes.
- A holiday square's tooltip names the holiday even on a day with no visits.
- Legend swatch and caption: "Grey-striped squares mark holidays."
- The monthly calendar is unchanged (its holidays are named chips).
Reason: User request.
Testing Performed: ESLint clean; `npx vitest run src/features/dashboard`: 57 passed. Not checked in a browser: stripe strength on a 20px square needs a look.
Known Issues: The stripes sit behind the day number; if they make digits hard to read, thin them.
Next Steps: Check the yearly view on screen.

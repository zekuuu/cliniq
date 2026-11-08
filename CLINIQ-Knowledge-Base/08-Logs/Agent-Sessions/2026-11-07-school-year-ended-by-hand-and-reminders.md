Date/Day/Time: Saturday, November 07, 2026 — 12:15 PHT (local clock, UTC+8)
Agent: Claude Code (Opus 5.5)
Task: End a school year by hand (the break sits between the end and the next start), and remind Staff before a start or end is due
Status: Completed
Prompt/Request: Zean, in chat: "does school year ends when starting another, shouldnt it be manual since ending it meaning there's vacation before starting again", then "also reminder when the start date is near".

Files Modified:
- `frontend/src/lib/schoolYear.ts` (+ test): `endedOn` and `endedBy` on a start; `started` and `endedOn` on `SchoolYear`; `schoolYearStep` (end or start, due, soon); `SCHOOL_YEAR_NOTICE_DAYS = 7`; `isInSession` follows the manual end.
- `frontend/src/lib/mock-db/api.ts`: `endSchoolYear`. `startSchoolYear` now needs the current year ended first and refuses the end day itself. `getArchive` returns `step` and `currentEndedBy`. The Dashboard reminder carries `kind` and `overdue`.
- `frontend/src/lib/mock-db/types.ts`, `integrity.ts` (optional end fields, end on or after start, every year but the last ended before the next starts), `mock-db.json` (2025–2026 ended April 14, 2026).
- `frontend/src/types/dashboard.ts`, `features/dashboard/components/AttentionChips.tsx` (neutral "coming up" chip, warning chip once overdue).
- `frontend/src/features/archive/ArchivePage.tsx` (+ test): one button for the next step, End or Start, each confirmed; the card says "In session" or "Ended …; on break".
- Documents: a note on ADR-075, `Decisions-Summary.md`, `Screen-Inventory.md`, `Frontend-Changelog.md`.

Changes Made:
- **End school year** (Archive page, Staff only): today becomes the last class day and the break begins tomorrow. Audited as "Ended school year 2026–2027". A year can't be ended twice. Visits during the break stay in the ended year until the next one is started.
- **Start school year** shows only after the year has ended, and not on the day it ended. The new year begins today; the ended year, with its break, ends yesterday.
- **Nothing happens by itself.** Past the last class day the year stays in session; past the start date it stays on break.
- **Dashboard reminders** (Staff only), from the date settings: "School year 2026–2027 ends Apr 14, 2027: end it on the Archive page" from 7 days before, as a neutral chip with a calendar icon. "School year 2026–2027 has not been ended (due Apr 14, 2027)" once the day has passed, as a warning chip. The start works the same way: "… starts Jun 15, 2027: start it …", then "… has not been started …". The ending reminder also shows on the last class day itself. The 7 days is a starting value (`SCHOOL_YEAR_NOTICE_DAYS`).
- **Change from the request:** Zean asked for a reminder before the start date. The same 7-day reminder is also given before the end date, since ending is now a manual step too.

Reason: Zean, in chat, Saturday, November 7, 2026 (note on ADR-075).

Testing Performed:
- `schoolYear.test.ts`: in session until ended, then on break; the next step and its due and soon days for the end and the start.
- `ArchivePage.test.tsx`: no automatic end; overdue and coming-up reminders (none for the Admin, none more than 7 days before); `endSchoolYear` Staff-only, audited, not twice; Start refused before the end and on the end day; the break stays in the ended year; the next start ends the old year yesterday; end then start through both confirmations; no buttons for the Admin.
- Typecheck 0 errors, lint 0 errors. Full run: 1131 passed, 3 failed (1134). The 3 failures are the existing calendar and Student Health Record tests from commit `1b50a113`.

Known Issues: the reminder tests set the store's date; the rest of the suite uses the real date. From April 7, 2027, a Staff Dashboard opened on seed data will show the end reminder. This is correct behaviour.

Next Steps:
- Backend branch: `endedOn` and `endedBy` per year, and Staff-only end and start endpoints with the same rules (ADR-075).
- Confirm the 7-day notice with the nurse (Team Tasks).

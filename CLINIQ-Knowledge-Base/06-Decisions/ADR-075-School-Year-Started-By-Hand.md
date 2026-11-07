> **Amended Saturday, November 07, 2026 — 12:15 PHT:** Zean asked in chat: "shouldnt it be manual since ending it meaning there's vacation before starting again", then "also reminder when the start date is near". Ending is now a separate manual step: Staff press "End school year", which makes today the last class day and starts the break. "Start school year" appears only after that. Records made in the break stay in the ended year. The Dashboard reminds Staff 7 days before an end or start is due, with a neutral chip, and with a warning chip once the day has passed. The date settings give both due days. Items 1 to 3 below describe the first version. Session: [2026-11-07-school-year-ended-by-hand-and-reminders](../08-Logs/Agent-Sessions/2026-11-07-school-year-ended-by-hand-and-reminders.md)

# ADR-075: Staff start each school year by hand; the Dashboard reminds them when one is due

**Date:** Saturday, November 07, 2026 — 12:05 PHT
**Status:** Accepted. Zean asked in chat: "where can clinician like start or end school year manually, not automatically based on the dates set". Given three options, Zean chose option 1 (manual only) and added "then if not started show reminder in dashboard". Amends ADR-072 item 2. **Built** the same day ([session](../08-Logs/Agent-Sessions/2026-11-07-school-year-started-by-hand.md)).

## Context
ADR-072 derived the current school year from the date settings, so a year started and ended by itself. The clinic wants to decide when the year changes.

## Decision
1. **A school year starts only when Staff start it.** The Archive page has a "Current school year" card. Staff see "Start school year YYYY–YYYY" there and confirm it in a dialog. The new year begins that day, and the year before ends the day before. The Admin reads the card but gets no button.
2. **Ending a year means starting the next one.** The current year stays current past its due date until someone starts the next. The summer break stays in the year that just ended.
3. **The date settings now only say when the next year is due.** Once that day passes and the year has not been started, Staff see a Dashboard chip: "School year YYYY–YYYY has not been started (due Month D, YYYY)". It links to the Archive page. The Admin gets no reminder, because the Admin cannot start a year.
4. **What is stored.** Each start is a row in `schoolYearStarts`: label, `startedOn`, `startedBy`. Rows are oldest first, one per label. Each start is audited as "Started school year YYYY–YYYY". Archived records keep their stored `archivedSchoolYear`. Reports, the audit tab and the Sports Report window take their year from the stored starts. Dates before the first recorded start fall back to the date settings.
5. **No undo on screen.** The dialog says so. Starting twice on the same day is refused.

## Alternatives Considered
- **Manual, with a reminder on both the Dashboard and the Archive page (option 2).** Not chosen as such. The Archive card does say when the next year is due.
- **Automatic by date, with a manual override (option 3).** Rejected: the year would still change by itself.

## Consequences
- The seed records two starts: 2025–2026 on June 16, 2025 and 2026–2027 on June 15, 2026.
- Backend: `schoolYearStarts` (or a `school_years` table with `label`, `started_on` and `started_by`) and a Staff-only "start school year" endpoint. The ERD and API need these (backend branch).
- Canonical documents need the manual start (DOC).

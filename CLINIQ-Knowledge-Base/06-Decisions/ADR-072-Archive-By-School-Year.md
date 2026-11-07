> **Note, Saturday, November 07, 2026 — 12:05 PHT:** a school year now starts only when Staff start it on the Archive page; the dates only say when the next one is due, and the Dashboard reminds Staff once it is overdue. Item 2 is amended. See [ADR-075](ADR-075-School-Year-Started-By-Hand.md).

# ADR-072: One Archive page by school year, with the school year's dates in settings

**Date:** Saturday, November 07, 2026 — 06:37 PHT
**Status:** Accepted (Zean, in chat, Saturday, November 7, 2026 — 04:20 PHT: "one Archive page by school year, plus a school-year switcher driven by the date, with the school year's dates held in settings because they may change"). Relates to ADR-047 (yearly import archives students missing from the list), ADR-051 (automatic archive) and ADR-057 (the audit log is kept 10 years). **Built** the same day ([Part 3 session](../08-Logs/Agent-Sessions/2026-11-07-consultation-part-3-school-years-and-archive.md)).

## Context
At the consultation of Friday, November 6, 2026 the professor asked where old records go at the end of a school year, and warned against overbuilding it. The school's dates (June 15 to April 14) came from the Principal's meeting of October 17, 2026 and were hard-coded for the Sports Report's "school year" window.

## Decision
1. **School-year settings:** `schoolYearStartMonth`/`schoolYearStartDay` (default 6/15) and `schoolYearEndMonth`/`schoolYearEndDay` (default 4/14). Staff edit them; the Admin reads them; each save is audited by field name only. A month must be 1 to 12 and a day valid for its month (February counts 28); the end may not equal the start.
2. **A school year** is named "2026–2027" (en dash). It starts on the start date and runs until the day before the next start, so the summer break belongs to the year that just ended. The end date only tells "in session" from "break". Helpers: `schoolYearOf(date, settings)` and `currentSchoolYear(settings, today)` in `frontend/src/lib/schoolYear.ts`. The Sports Report's window follows the setting.
3. **Archived records store their school year.** Archiving a student or staff member stores `archivedAt`, `archiveReason` and `archivedSchoolYear` (the label at that moment), so a later change of the dates never moves an old record. The manual Archive on a profile now asks a required reason from a short list plus "Other" (a mid-year transfer is "Transferred"); the yearly student import stores "Not on the new list". The staff import archives nobody (ADR-069), so it writes none.
4. **One read-only page,** `/archive`, for Staff and the Admin: a school-year switcher (every year with archived records, clinic records or audit entries, plus the current one; default the newest year with an archived record) and tabs: Students, Staff (Staff only, ADR-043), Reports (that year's months, each opening the Monthly Report) and Audit log (the existing table and filters, starting on that year's dates; nothing leaves the log). No folders, no editing. Two doors: a sidebar item in Administration and an "Archive (N)" button on the Student List. The school-year dates sit on the same page, in a small card.

## Alternatives Considered
- **Derive every record's school year from its date.** Rejected: a change of the dates would move old archived records between years.
- **A separate settings screen.** Not built: CLINIQ has no settings screen; one card on the Archive page is the smallest place.
- **Per-year folders or exported archives.** Rejected as overdoing it (the professor's warning).

## Consequences
- The ERD and API need the three archive fields on students and staff and the four school-year settings (hand-off note in the Part 4 session log).
- Reports and the audit tab compute their year from dates and the current settings; only archived records keep a stored label.

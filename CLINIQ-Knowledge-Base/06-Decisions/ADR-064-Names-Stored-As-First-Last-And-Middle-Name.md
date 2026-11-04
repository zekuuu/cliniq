# ADR-064: Names are stored as first name, last name and an optional middle name

**Date:** Wednesday, November 04, 2026 — 23:26 PHT
**Status:** Accepted (Zean, in chat, Wednesday, November 4, 2026 — 22:25 PHT). Extended to staff by Zean in the question pop-up of the same session ("Yes, split staff too"). Amends ADR-058's audit wording. Settles ERD open decision D-15 for the frontend; the ERD, Data Dictionary, schema and API contract are updated on the `backend` branch by a separate prompt.

## Context
The Add and Edit Student form had one "Full name" field, stored as one string. The school's list keeps the surname, given name and middle name apart. The yearly import already maps those three columns, and then joined them back into one string. Search and sorting also need the parts: a school list is read by surname. The ERD left the split open until the registrar's file format was known (D-15).

## Decision
1. **A student's name is stored as `firstName`, `lastName` and an optional `middleName`** (null when there is none). The form asks for them in that order: First name and Last name required, Middle name optional (ADR-051's required marks). Each part is trimmed and its spaces collapsed. Limits: first name 50, middle name 40, last name 50 characters, which keeps the joined name inside the ERD's 150.
2. **Staff names are stored the same way** (Zean, in the pop-up). The Staff form uses the same three fields.
3. **`fullName` is never stored.** It is built on read as "First Middle Last" (for example "Maria Angela Santos Dela Cruz") by one helper, `formatPersonName` in `frontend/src/lib/personName.ts`. Every screen and printout that showed the full name still shows it.
4. **Lists sort by last name, then first name, then middle name** (Zean, in the pop-up): the Student List, the Staff List, the Incomplete Records queue, the import's "not in this file" list, the patient search and the Sports Report.
5. **Search by name matches any part, both parts in any order, or the full name** ("dela cruz", "maria santos"), ignoring case, accents and extra spaces. Duplicate detection compares the joined name the same way.
6. **A name correction names the changed part, never the value:** "Updated last name. Name corrected; reason: …". This replaces ADR-058's "Updated name. …" wording; the reason rule is unchanged.
7. **The yearly import** maps separate First, Last and Middle name columns directly. A file with one full-name column is still accepted: without a comma, the last word is the last name and the rest is the first name; with "Surname, First Middle", the last name is before the comma and the last of two or more words after it is the middle name. The preview lists every split so the registrar can correct the file.

## Alternatives Considered
- **Keep one full-name field.** Rejected: the school's list keeps the parts apart, and sorting by surname needs them.
- **Store the parts and a copy of the full name.** Rejected: two copies can drift.
- **Split students only.** Not chosen by Zean.

## Consequences
- The mock data (`mock-db.json`) and its integrity check store the parts; a stored `fullName` is rejected as a derived value. A browser copy saved before this change is split on load by the import's rule.
- The list-row contract (API contract Q2) is unchanged: list rows still carry `fullName` only, and the lists arrive already in last-name order.
- The canonical documents that describe the student record (Modules & Features, Frontend Context Brief §5) still say "full name" and need the same update.
- Backend hand-off: field names, limits and rules are in the session log's "For the backend branch" note.
- Session: [2026-11-04-pager-history-scroll-report-link-name-split](../08-Logs/Agent-Sessions/2026-11-04-pager-history-scroll-report-link-name-split.md)

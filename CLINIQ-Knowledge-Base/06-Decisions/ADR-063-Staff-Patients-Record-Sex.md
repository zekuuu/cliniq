> **Note, Monday, November 02, 2026 — 15:05 PHT:** Zean chose option S3: the Dashboard Trends by-sex view is now one split bar, not the stacked bar below. The count rule stands, and the students and staff split stays in words on the Female and Male buttons. Session: [2026-11-02-sex-split-bar-grade-columns](../08-Logs/Agent-Sessions/2026-11-02-sex-split-bar-grade-columns.md)

# ADR-063: Staff patients record sex, and the by-sex counts include them

**Date:** Sunday, November 1, 2026 — 22:36 PHT
**Status:** Accepted (Zean, in chat, Monday, November 2, 2026 — 04:53 PHT; the count rule answered in the question pop-up of the frontend review round 2 prompt, Part 1).

## Context
ADR-043 gave staff no sex field, so staff could not appear in the by-sex chart and showed only as "Staff (no sex recorded)" in the report. Zean wants sex recorded for staff.

## Decision
1. **`Personnel.sex` is `female` or `male`,** required on the Add and Edit Staff form as two radio buttons. It shows on the Staff Profile (Staff only), never in a list, and never to the Admin beyond the counts. The audit names the field, never the value.
2. **By-sex counts cover everyone and show the split.** The Dashboard Trends chart, the Monthly Report's Visits by sex and the Trends printout show Female and Male, with Students and Staff as the two parts.
3. The Admin's incident counts still leave staff incidents out (ADR-053). The clinician's include them.
4. The Sports Report, the Frequent-visitor panel, the by-grade chart and the complaint trends stay about students.
5. A record with no sex counts under "No sex recorded", so nothing disappears silently. That row shows only when such a record exists. No seeded record needs it.
6. **`personnel.sex` is `NOT NULL`; `students.sex` stays nullable.** Students arrive by import, where a value can be missing. Staff are typed one by one, so the form can always ask. A saved browser copy from before this change holds null until the record is edited; the real database starts with the rule.

This amends ADR-043 items 3, 8 and 11 and the ADR-053 wording that calls staff "no sex recorded". It changes the ERD after its approval (ADR-057), which that approval allows through a new decision.

## Alternatives Considered
- **Keep staff without sex.** Rejected: Zean wants it recorded.
- **An optional field.** Rejected: the counts would keep a permanent "No sex recorded" remainder.
- **A separate "Staff by sex" table under a student-only chart.** Not chosen by Zean; ADR-043's own rule is to count everyone and show the split.

## Consequences
- The by-sex chart is now a stacked bar, because a doughnut cannot show two parts of each group.
- The ERD diagram images are not yet regenerated, and the constraint tests are not re-run (no MariaDB on this workstation). See the open `DOC`.
- Session: [2026-11-01-frontend-review-round-2-part-1](../08-Logs/Agent-Sessions/2026-11-01-frontend-review-round-2-part-1.md)

# ADR-055: The Monthly Report's weeks run Sunday to Saturday

**Date:** Saturday, October 31, 2026 — 12:18
**Status:** Accepted (Zean, in chat, Saturday, October 31, 2026 — 12:18 PHT). Refines ADR-050 item 4.
**Note (Saturday, October 31, 2026 — 19:28 PHT):** Zean: the Dashboard Trends month chart must match too. Built Saturday, October 31, 2026 — 19:46 PHT: it runs Sunday to Saturday.

## Context
The weekly breakdown (ADR-050 item 4) used Monday-start weeks labelled to the last weekday, with a short last week merged into the one before it. October 2026 therefore read 1-2, 5-9, 12-16, 19-23 and 26-30, which left visible gaps and did not match the Activity calendar, which shows Sunday to Saturday.

## Decision
The Monthly Report's weeks follow the Activity calendar: Sunday to Saturday, clipped to the month. A month that starts on a Thursday opens with Thursday to Saturday. October 2026 reads 1-3, 4-10, 11-17, 18-24 and 25-31. A short first or last week stays on its own, and a one-day week shows one date. The screen and the printout both use these weeks.

## Alternatives Considered
Keeping the Monday-to-Friday weeks that follow the paper report: rejected by Zean, because they disagree with the calendar on the same system.

## Consequences
The columns no longer match the clinic's paper report week for week, and a month can show six columns. Monthly totals do not change. The nurse should confirm this suits the clinic's own records.

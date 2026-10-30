# ADR-050: Reports, Dashboard and calendar: exact counts, a cluster alert, weekly and inventory prints, and "Activity calendar"

**Date:** Thursday, October 29, 2026 — 12:33 PHT
**Status:** Accepted (Zean, in the "CLINIQ Decisions to Answer" sheet, recorded Thursday, October 29, 2026 — 12:33 PHT). **Items 2, 3, 4 and 6 built** on `build/decisions-sheet-answers-oct29`: the cluster alert Friday, October 30, 2026 — 00:17 PHT ([Part 3 session](../08-Logs/Agent-Sessions/2026-10-30-decisions-build-part-3-admin-audit-and-dashboard.md)); complaint grouping, the weekly breakdown, the monthly inventory print and "Activity calendar" Friday, October 30, 2026 — 00:26 PHT ([Part 4 session](../08-Logs/Agent-Sessions/2026-10-30-decisions-build-part-4-reports-and-calendar.md)).

## Context
Zean answered the sheet's questions on report privacy, outbreak alerts, the clinic's paper reports, and the Calendar.

## Decision
1. **Reports and the Dashboard show exact counts,** with no masking of small groups. The risk was explained (a small group can point to one child) and Zean chose exact counts.
2. **A possible-cluster alert on the Dashboard** for the clinician: 3 or more students with the same complaint and the same grade within 3 days (the numbers in `config`). Students only. Nothing is sent to the Principal, because he cannot be reached from his own office.
3. **Reports group complaints by a clean list:** trimmed, case-insensitive, matched to the suggestion list; no merge screen.
4. **The Monthly Report gets a weekly breakdown** like the clinic's paper report, and **a monthly inventory print** (New Purchase, Total Available, Ending Inventory per item).
5. **No "Finalize month":** reports stay computed live.
6. **The Calendar is renamed "Activity calendar"** and nothing is added; the Admin still manages school events (ADR-042).
7. **The three Sports Report assumptions are accepted** (ADR-034): archived students stay on the saved list but are left out of the printout with a count; the school year starts June 15; an incident outcome reads "Referred to hospital" or "No hospital referral recorded".

## Alternatives Considered
- **Mask counts under 5** (the suggestion). Not chosen.
- **A working schedule calendar** with follow-ups due, expiring stock and exams. Not chosen; the professor asked to keep to the main functions.

## Consequences
- With exact counts, a printed or on-screen report can reveal a single child in a small group; the clinician and the Admin who see it are already authorised to see that child's record, and the printout is handed over by the clinician (ADR-038).
- The cluster alert is a flag; nobody is forced to act.
- Session: [2026-10-29-decisions-sheet-answers-applied](../08-Logs/Agent-Sessions/2026-10-29-decisions-sheet-answers-applied.md)

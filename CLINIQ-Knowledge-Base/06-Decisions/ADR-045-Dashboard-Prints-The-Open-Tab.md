# ADR-045: The Dashboard prints the open tab

**Date:** Monday, October 26, 2026 — 11:13 PHT
**Status:** Accepted

## Context
ADR-026 made the Dashboard print one Clinic Overview Report whichever tab was open. That report mixed the content of both tabs. Its key figures did not match the screen's stat cards, and it left out the Sex / Grade level breakdown. In the system review on Monday, October 26, 2026, Zean asked to "update the dashboard print with the actual dashboard, also in dashboard print which tabs he's on". Zean then chose "Print current tab only". Zean also said the print "shouldn't be like duplicate of the UI, it should be meaningful".

## Decision
- **Overview tab:** prints the **Clinic Overview Report**. It has the screen's five stat-card figures in the screen's order: Active students, Clinic visits, Pending excuse letters, Incidents, and Due & overdue follow-ups. Next come the attention chips' counts: Incomplete records, Low-stock items, and Expired or expiring. Then the templated written summary. Then the lists the cards and chips link to: due follow-ups, frequent visitors (when shown), excuse letters awaiting approval, and low-stock and expiring items.
- **Trends tab:** prints the **Clinic Trends Report**. It has Students' visits and incidents by sex and by grade level as tables, complaints (bars, table, and any symptom cluster), and visit activity. The active Trends filter is stated in the scope line.
- The scope line names the tab that was printed ("Dashboard tab: Overview" or "Dashboard tab: Trends").
- The printouts carry tables and figures, not pictures of the screen's charts and buttons.

## Alternatives Considered
- Keep printing everything and only name the tab. This was not chosen; Zean picked printing the current tab only.
- Print only the screen's items, without the lists. This was not chosen, because a count without the rows behind it can't be acted on from paper.

## Consequences
- This amends ADR-026's "the Dashboard prints the Clinic Overview Report whichever view is open". Everything else in ADR-026 stands.
- Printing both tabs takes two prints.
- The canonical Frontend Design Reference (Reference 1's print behavior) needs a matching note.

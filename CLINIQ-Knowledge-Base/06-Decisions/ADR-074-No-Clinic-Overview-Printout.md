# ADR-074: No Clinic Overview printout; Reports keeps its four monthly reports

**Date:** Saturday, November 07, 2026 — 11:43 PHT
**Status:** Accepted (Zean, in chat, Saturday, November 7, 2026: "remove clinic overview in report, it's redundant since there's already report that basically scope them"). Amends ADR-070 (its Clinic Overview tab in Reports) and supersedes ADR-045 (the Dashboard printed the open tab) and the Dashboard part of ADR-026 and ADR-044. **Built** the same day ([session](../08-Logs/Agent-Sessions/2026-11-07-remove-clinic-overview-report.md)).

> **Note (Sunday, November 08, 2026 — 18:45 PHT):** ADR-077 gives the Admin a simpler Reports page: a Report month drop-down, these four reports as a list, and each opened as a view-only paper sheet. Staff keep the four tabs.

## Context
ADR-070 moved the Dashboard's Clinic Overview printout into a Reports tab. The Monthly Report, Incident register, Symptom summary and Inventory sheet already cover the same figures for a month, so the tab repeated them.

## Decision
1. Reports has four tabs only: Monthly Report, Incident register, Symptom summary, Inventory sheet.
2. The Clinic Overview printout is gone. The Dashboard prints nothing (as since ADR-070). `ClinicOverviewReport.tsx` and `DashboardPrint.tsx` are deleted.
3. The Dashboard screen is unchanged.

## Alternatives Considered
- **Keep the tab.** Rejected by Zean: it repeated the monthly reports.

## Consequences
- No printout lists the Dashboard's due follow-ups, frequent visitors or pending excuse letters for a chosen period. Each list's own screen still shows them.
- The tests for that printout were removed with it. One test now checks that Reports has only the four tabs.
- Canonical documents that mention a Dashboard or Clinic Overview printout need updating (DOC).

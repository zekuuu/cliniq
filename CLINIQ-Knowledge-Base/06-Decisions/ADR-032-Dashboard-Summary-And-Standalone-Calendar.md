# ADR-032: Dashboard Summary and Standalone Calendar

**Date:** Sunday, October 18, 2026 — 13:17 PHT
**Status:** Accepted

## Context

The professor found the Dashboard overwhelming: summary totals, inventory, incomplete records,
frequent visitors, trends, and the calendar competed for attention. Zean decided on Saturday,
October 17, 2026 that the existing calendar should become its own sidebar screen.

## Decision

- Dashboard starts with visits, incidents, active students, pending excuse letters, and due or
  overdue follow-ups. Staff can drill into the matching detail; Admin sees static counts when the
  target is Staff-only.
- Low-stock, expired-or-expiring, and incomplete-record counts are compact attention chips that
  link Staff to their filtered Inventory or Incomplete Records destinations. Frequent visitors
  remain lower on Overview.
- Dashboard has two `Tabs` views: Overview and Trends. Legacy `?view=calendar` replaces to
  `/calendar`.
- Calendar is a standalone Staff/Admin top-level screen using the existing calendar component,
  including its period, display, holiday layer, and Staff day-event editing. It has no print action.
- Dashboard print excludes calendar event and holiday material.

## Consequences

- ADR-011's five-card dashboard statement and ADR-025's three-view dashboard structure are
  superseded only as described above.
- The overview-tab badge counts follow-up, inventory, and incomplete-record attention.
- The first view follows the professor's list, not a nurse interview. The existing nurse-interview
  `LATER` remains open.


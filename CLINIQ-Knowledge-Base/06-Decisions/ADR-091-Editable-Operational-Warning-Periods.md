# ADR-091: Staff may edit two operational warning periods

**Date:** Thursday, November 26, 2026 — 03:31 PHT
**Status:** Accepted (Zean asked for more Settings items and delegated the selection: “I'll let you decide or pop up a multiple choice”).

## Decision

The Settings page exposes two existing `system_settings` values: upcoming follow-ups (default 7 days, range 1–30) and approaching inventory expiry (default 30 days, range 1–180). Staff edit; Admin reads. The API validates whole days, saves only changed values, clears the settings cache and audits field names without values. The success toast offers Undo through the ordinary update path after checking that the saved values remain current (ADR-089). No new setting keys or schema migration are needed. School-year dates remain on Archive under ADR-072; security and clinical limits stay fixed.

## Consequences

The Dashboard, Follow-Up List and Inventory already use these settings, so their horizons change on the next request or read. The canonical Modules & Features and Frontend Context Brief need updating through the group's document review.

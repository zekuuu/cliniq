# ADR-004: Screen-Context Display-Privacy Rule

**Date:** First proposed September 19–20, 2026; corrected September 20, 2026
**Status:** Accepted (corrected once after initial proposal). **Amended by ADR-027 and ADR-028 (decided Saturday, October 17, 2026 — 07:52, not built):** multi-student lists show the **masked LRN** instead of the name, and single-student views still show the name; the rule is otherwise unchanged. **Built Wednesday, October 21, 2026 — 07:00** ([2026-10-21-lrn-replaces-student-number](../08-Logs/Agent-Sessions/2026-10-21-lrn-replaces-student-number.md)): in force, with the LRN in place of the Student Number. The ADR-034 Sports Report is a decided exception (full names, Staff only), built Wednesday, October 21, 2026 — 07:23 ([2026-10-21-sports-report](../08-Logs/Agent-Sessions/2026-10-21-sports-report.md)); it applies to that feature only.

## Context
Concern raised: could someone connect to the internet and access a QR-reachable screen? Follow-up clarification: the actual concern was a bystander glancing at a desktop screen showing a *pattern* across multiple students (e.g., a frequent-visitor list) and inferring something about a specific named student — not the QR scan result itself, which is a deliberate single-student lookup.

## Decision
Multi-student list/dashboard views (Visit Log List, Incident Log List, Dashboard's frequent-visitor section) show the **Student Number**, not the name. Single deliberate lookups (QR scan result, full profile, search, masterlist) show the **full name** normally.

## Alternatives Considered
The first version of this rule had it backwards — QR scan results defaulting to Student Number, full name only on deeper drill-in. Corrected after clarification that a QR scan *is* the deliberate, legitimate single-lookup case the rule should exempt, not restrict.

## Consequences
Every screen in the Frontend Context Brief, Modules & Features, and Project Plan needed updating to reflect the corrected version — a reminder that this rule needs to be applied consistently to any *new* screen added later, not just the ones that existed when it was written.

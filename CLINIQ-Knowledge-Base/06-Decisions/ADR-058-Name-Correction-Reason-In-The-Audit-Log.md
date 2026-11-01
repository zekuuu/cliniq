# ADR-058: The name-correction reason goes in the audit log

**Date:** Sunday, November 1, 2026 — 11:48 PHT
**Status:** Accepted (Zean, in chat, Sunday, November 1, 2026 — 11:46 PHT). Reverses API contract Q3. Makes one exception to ADR-017's "fields or states only".

## Context
API contract Q3 moved the name-correction reason out of the audit summary and onto the student record, because the reason can hold a person's name. No screen read that field, so nobody could see why a name was corrected. Zean was offered the Student Profile for Staff, or the Audit Log. Both the Staff and the Principal read the Audit Log.

## Decision
A name correction's audit summary reads "Updated name. Name corrected; reason: <reason>". It never carries the old or new name. `students.name_correction_reason` also keeps the latest reason, as the approved ERD has it. No other audit summary carries a typed value.

## Alternatives Considered
- **Show the reason on the Student Profile, Staff only:** Claude's recommendation, keeping ADR-017 whole. Not chosen: Zean wants it with the record of who changed what.
- **Audit Log, shown to Staff only:** not chosen; it needs a role rule on one summary.

## Consequences
- The Principal can read the reasons, and a reason is kept for the audit log's 10 years. Staff should not type another person's details in it; the form's rule of at least 3 characters is unchanged.
- The backend writes the same summary. Backend Q3 notes in `Backend-Issues-and-TODOs.md` need this change.
- **Canonical documents need updating:** the audit trail requirement in Modules & Features, if it says summaries name fields only.
- Session: [2026-11-01-frontend-cleanup-part-1-decisions](../08-Logs/Agent-Sessions/2026-11-01-frontend-cleanup-part-1-decisions.md)

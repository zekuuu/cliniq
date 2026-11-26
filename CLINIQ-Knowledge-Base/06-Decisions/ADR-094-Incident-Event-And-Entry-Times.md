# ADR-094: Separate incident event, reading, arrival and entry times

**Date:** Thursday, November 26, 2026 — 14:18 PHT
**Status:** Accepted by Zean for implementation; clinic-arrival field awaits the nurse's confirmation

## Source and context

The clinic's feedback asked: “Incident recording must be quick, especially in emergencies,” and “keep the system-recorded entry time for audit, and let personnel record the actual time of the events.” Zean confirmed the recommended interpretations on Thursday, November 26, 2026. This amends the Stage 1 reading rules in Module Overview, ADR-049, ADR-065 and ADR-051; those historical decisions remain unchanged as records of the earlier design. ADR-057's approved schema is extended by a new migration.

## Decision

- Stage 1 identifies one student or staff patient and records one emergency complaint. “When it happened” defaults to the current Philippine time and may be edited. Additional notes remain optional. The API rejects submitted Stage 1 readings with 422. A temperature carried from an escalated visit is retained without asking the clinician to enter it again; the visit's event time remains the initial incident time.
- All four readings remain optional in Stage 2. Each recorded reading has its own clinician-entered time; the append-only reading row's `recorded_at` holds that time. Existing Stage 1 readings remain visible in Stage 2 and in reports. Corrections append a reading row.
- Stage 2 may edit `occurred_at` until report approval. `created_at` records the entry time and is never editable. Stage 2 optionally records `arrived_at_clinic_at`; old rows stay null. There is no hospital-arrival field, guardian-contacted field, or incident late-entry flag. Existing hospital departure and contact-attempt timestamps remain.
- Future event, arrival and reading times are refused. There is no past-date cutoff. Arrival before the incident and hospital departure before clinic arrival show warnings but do not block saving. There is no database CHECK ordering these events because the warnings are deliberately nonblocking.
- The Incident Report shows “When it happened,” optional clinic arrival, optional hospital departure, reading times and “Recorded at.” Incident lists, calendar, Dashboard, monthly and Sports Report grouping use `occurred_at`; changing it can move a record between days or months. Existing incident event times are not backfilled.
- Edits are audited by field name only. Approved reports lock event, arrival, reading times and Additional notes. Completed Stage 2 and approval retain their existing one-way behavior under ADR-089.

The optional clinic-arrival field is pending the nurse's confirmation. If she rejects it, a later decision and migration will remove it. The backend issues file tracks that review.

## Documentation impact

The canonical Modules & Features, Frontend Context Brief, Frontend Design Reference, Project Plan and SRS may still describe Stage 1 readings or incident time as entry time. The groupmate owns the Project Plan and SRS; their Markdown copies are left for `/update-docs` and `/apply-docs` after her decision.

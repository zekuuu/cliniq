# ADR-044: Full LRN on the Dashboard printout

**Date:** Monday, October 26, 2026 — 11:04 PHT
**Status:** Accepted

## Context
The Dashboard's printout (the Clinic Overview Report, ADR-026) lists several students: due and upcoming follow-ups, frequent visitors and excuse letters awaiting approval. Under ADR-004 and ADR-028 it showed only masked LRNs (`●●●●●●●●1234`). In the system review on Monday, October 26, 2026, Zean asked for the Dashboard print to "show LRN". Asked to choose, Zean picked "Full LRN on print only".

## Decision
The Clinic Overview Report prints the full 12-digit LRN wherever it lists a student. A staff member still prints by Staff No. No names are printed. The Dashboard screen is not changed: it still shows masked LRNs. The other multi-student printouts (the Monthly Report and the Audit Log) are not changed either.

## Alternatives Considered
- Add the masked LRN where a section had none. This was not chosen because the request was for the LRN itself.
- Show the full LRN on the screen as well. This was not chosen because the bystander concern of ADR-004 applies to the open screen, not to a sheet the nurse holds.

## Consequences
- This narrows ADR-004 and ADR-028 for one printout. The Dashboard screen and every other list stay masked.
- The paper is more identifying, because the LRN links to school and DepEd records. It must be handled like the other clinic printouts. Only Staff can print (ADR-038 item 3).
- The canonical documents (Modules & Features, cross-cutting display rule) need a matching note. See `09-References/Canonical-Documents.md`.

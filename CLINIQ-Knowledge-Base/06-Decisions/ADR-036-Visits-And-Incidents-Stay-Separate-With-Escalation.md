# ADR-036: Visits and incidents stay separate forms, and a visit can be escalated to an incident

**Date:** Thursday, October 22, 2026 — 15:51 PHT
**Status:** Accepted (Zean, Thursday, October 22, 2026 — 15:44, "yes possible"). Not built yet: part 2 of `Prompt-Build-Panel-Review-Fixes-Oct22.md`. The nurse's own rule for what counts as an emergency is still open (see the `DECIDE` "Rule for Visit versus Incident").

## Context
The panel-style review (VS-7) found that Visit complaints and Incident types overlap (Fainting, Asthma attack, Severe allergic reaction, Fall injury), so one event can be logged twice or in the wrong place, and an event that starts as a routine visit and turns serious means retyping everything. It suggested either one form or an "Escalate to incident" button. The clinic keeps two logbooks on paper (Daily Visits, and the Emergency Logbook), with different columns. Zean asked which was best and where the button belongs.

## Decision
1. **Keep two forms.** A visit is routine care with a disposition and sometimes an excuse letter. An incident is two-stage emergency capture with readings, parent notification, a hospital referral and a signed report.
2. **Add "Escalate to incident" in two places:** on Visit Details (a visit already saved) and as a shortcut on the New Visit form (nothing saved yet). Both open Incident Stage 1 with the student, complaint, the visit's time and the temperature carried over.
3. **The visit is kept, never deleted or converted.** It is linked both ways (`Visit.escalatedIncidentId`, `Incident.sourceVisitId`, PROVISIONAL, pending the ERD) and shows "Escalated to incident". Medicines already given stay on the visit; they are **not copied** to the incident, so stock is deducted once (ADR-018).
4. **An escalated event counts once, as the incident** in visit totals, the calendar and the Dashboard (a default Zean can change).
5. **Emergency-type complaints on a visit show a non-blocking hint** ("This looks like an emergency. Escalate to an incident?"). They are not removed from the suggestions.

## Alternatives Considered
- **One "Case" form with an Emergency switch.** Rejected: different speed and different outputs (an excuse letter against an approved report), it would clutter routine visits or slow emergencies, and it does not match the clinic's two logbooks. Also judged not worth it at the October 13 review.
- **Two forms with no link (today).** Rejected: double logging and retyping continue.
- **Convert a visit into an incident in place.** Rejected: it would rewrite a record, and the stock and audit history belong to the visit.

## Consequences
- The ERD needs the two link columns and the counting rule in the selectors (`ERD.md`, `Data-Dictionary.md`).
- The written Visit-versus-Incident definition and the one-line rule on both forms wait for the nurse's wording.
- Session: [2026-10-22-panel-review-triage-and-build-prompt](../08-Logs/Agent-Sessions/2026-10-22-panel-review-triage-and-build-prompt.md)

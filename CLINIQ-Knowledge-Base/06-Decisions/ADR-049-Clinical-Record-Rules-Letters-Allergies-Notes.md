# ADR-049: Clinical record rules: letters, allergies, notes and what the clinic does not add

**Date:** Thursday, October 29, 2026 — 12:33 PHT
**Status:** Accepted (Zean, in the "CLINIQ Decisions to Answer" sheet, recorded Thursday, October 29, 2026 — 12:33 PHT). **Built in part** Thursday, October 29, 2026 — 23:49 PHT on `build/decisions-sheet-answers-oct29` (letters and visits: [Part 1 session](../08-Logs/Agent-Sessions/2026-10-29-decisions-build-part-1-letters-and-visits.md)); the record rules ("None recorded", the "avoid if allergic to" tag, Student's mobile number, Additional notes until approval) built Friday, October 30, 2026 — 00:02 PHT ([Part 2 session](../08-Logs/Agent-Sessions/2026-10-30-decisions-build-part-2-student-and-incident-records.md)). Amended Thursday, October 29, 2026 — 13:46 PHT: allergies and conditions stay one field each and say "None recorded" instead of "None" (also when empty), "Student contact information" becomes "Student's mobile number", and a field that can be saved empty shows no required mark (see [ADR-051](ADR-051-Starting-Values-Follow-Up-Closing-Vitals-Ranges-Automatic-Archive-And-Required-Marks.md)).

## Context
The decisions sheet carried many questions about what the Visit, Incident, excuse-letter and student records should hold. Zean answered them; the decisions share one theme: record clearly, trace easily, and leave clinical judgement to the clinician.

## Decision
**Excuse letters.** The clinician can "Save and approve now". A warning (never a block) shows when the excused period is longer than 3 days; the number is a `config` value the school can change. The final approved wording is stored with the approval, and a visit later edited to "Returned to class" gets an "outcome changed since approval" label. The letter keeps one basic format (student, dates, reason, clinic signature). A faint school logo goes with the boxed DRAFT warning, on screen (a draft cannot be printed, ADR-038).

**Visits.** "Show more fields" opens by itself for fever, headache or chills. For Sent home and Referred to hospital, optional fields record who collected the child, the relationship and the time. A follow-up and a letter can carry an optional "Stay home until cleared" note that the clinician sets (no fixed list of conditions). The outcome keeps its default, "Returned to class". No first-visit prompt, and the first-aid checklist stays as it is, owned and signed off by the clinician.

**Allergies and conditions** stay one field each (free text). The suggestion "None" reads "None recorded", and an empty field is shown with the same words in plain text, with no warning style and no extra states (ADR-051 replaced the three-state design chosen earlier the same day). Inventory items can carry an optional "avoid if allergic to" tag that raises a warning next to the allergies; there is no medicine-to-allergen map, and the system warns and never blocks (ADR-018).

**Student record.** "Student contact information" becomes "Student's mobile number" and is optional. There is no "can't be completed" closure: a field such as the emergency contact can stay empty and does not block the record, and shows no required mark (ADR-051).

**Incidents.** Additional notes can be corrected until the incident is approved. Medicines cannot be edited after Stage 2. No head-injury watch list, no "parents unreachable" or "released to" fields, and no emergency-medicine fields.

**No safety rule engine.** No dose, age, weight, repeat-interval or prescription rules; the clinician decides and the system records and keeps a trail.

**Deferred:** every extra feature from the sheet's list (immunization, clinic pass, queue, Excel export, SMS, and the others).

## Alternatives Considered
- **A full medicine-to-allergen map and a safety rule engine.** Rejected: the nurse would have to maintain it, and the legal status of items is a professional decision.
- **Two-step approval always.** Replaced by "Save and approve now" for the clinician who drafts.

## Consequences
- Needs migrations for letters and the student number rule.
- An empty allergies or conditions field shown as "None recorded" does not change the incomplete-records rule.
- The 3-day certificate limit is a starting value until the school gives its own.
- Session: [2026-10-29-decisions-sheet-answers-applied](../08-Logs/Agent-Sessions/2026-10-29-decisions-sheet-answers-applied.md)

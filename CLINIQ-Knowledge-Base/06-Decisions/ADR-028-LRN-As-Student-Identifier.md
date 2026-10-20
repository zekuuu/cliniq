# ADR-028: The LRN Is the Student Identifier

**Date:** Saturday, October 17, 2026 — 07:52
**Status:** Accepted (the team meeting of Friday, October 16, 2026, 7:00 PM). **Built Wednesday, October 21, 2026 — 07:00** ([2026-10-21-lrn-replaces-student-number](../08-Logs/Agent-Sessions/2026-10-21-lrn-replaces-student-number.md)). Zean confirmed the open points on Wednesday, October 21, 2026 ("ok to all" for the recommended defaults): the LRN is 12 digits kept as text, required, unique, editable (a correction is audited as "Updated LRN" with neither value), masked to its last four digits on lists, pickers, printouts and the Audit Trail, shown in full only on the Student Profile and the edit form, and never put in an address. Whether every student, transferees included, has an LRN is still unconfirmed by the school.

## Context
ADR-027 dropped the QR feature and the CLINIQ-made Student Number (`YYYY-NNNNN`), and left open what identifies a student afterwards. Earlier that evening Zean had said "LRN can be used too then Student name, but mostly student name." At the team meeting of Friday, October 16, 2026, 7:00 PM the team took it further: with QR gone the Student Number has no purpose, but names alone are risky because they can be mistyped, edited, repeated, and are hard to match. The LRN (Learner Reference Number) is unique, and no other number exists. Participants said every student, transferees included, has one (stated in the meeting; **not yet confirmed by the school**).

The source is an organized summary of an automatic transcript; the speakers are unnamed except one and about 8 minutes of the recording (22:13 to 30:52) are missing, so only the points the summary marks as solid are recorded here.

## Decision
1. **The LRN is the unique identifier of a student in CLINIQ.** It replaces the Student Number wherever the number was shown or used to find a student.
2. **The display-privacy design stays.** Lists with several students show the **LRN instead of the name** (what ADR-004 did with the Student Number), and a view of one student still shows the name. Clicking the LRN opens the student's information.
3. **A student can be found by** name plus section, birthday, or LRN.
4. **CLINIQ stays independent** of the school's NFC ID system (ADR-027). The LRN is a national learner number, not data from that system.

**Not decided here** (open `DECIDE` entries in Issues-and-TODOs.md, section "Professor consultation and team meeting, October 16"): whether lists, printouts and the audit trail show the LRN in full or partly hidden; the LRN's format check, what to do when it is missing or wrong, and whether a hidden internal id stays as the database key; and the school's confirmation that every student has an LRN.

## Alternatives Considered
- **Mostly the student name, LRN as an extra** (Zean's answer earlier that evening, recorded in ADR-027). Replaced by this ADR: names can be mistyped or repeated.
- **The school's own ID number.** Ruled out by independence (ADR-027).
- **Keep the CLINIQ Student Number without QR.** Rejected at the meeting: without QR it has no purpose as an identifier.

## Consequences
- **ADR-005 is superseded** (already by ADR-027). **ADR-004 and ADR-010 stay in force** once built, with "LRN" in place of "Student Number"; their status lines say so. ADR-017 (audit entries) and ADR-026 (A4 printouts) name a record by Student Number today and will use the LRN, which makes the masking question below matter.
- **The LRN is more revealing than the old number.** The Student Number meant nothing outside CLINIQ. The LRN is a government-issued learner number that links to school and DepEd records, so a screen or printout showing it identifies the child to anyone who holds those records. Whether to show it in full is an open `DECIDE`.
- **Until it is built the app still uses Student Numbers.** The mock data has no LRN field. ADR-027 still says agents must not change code until Zean asks for the prompt; this ADR does not change that.
- **ADR-027, item 3 ("mostly by name") is amended by this ADR.** The ERD draft's `students.student_number` becomes a unique `lrn` when the draft is next reviewed.

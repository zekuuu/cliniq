# ADR-027: Drop the QR Feature and the CLINIQ Student Number

**Date:** Friday, October 16, 2026 — 18:54
**Status:** Accepted (requested by Zean, project team; recorded only: **nothing is built or removed yet**, and the open questions below are not decided) **Amended the following evening by the team meeting of Friday, October 16, 2026, 7:00 PM:** the identifier is the LRN (ADR-028), not "mostly by name" (Decision item 3), and the Instructor and Principal questions are settled in ADR-029. The rest of this ADR stands.

## Context
Zean, Friday, October 16, 2026: "We will also drop the QR feature and drop the student number, and take it note for future maybe." The same day the course professor advised the team to limit the main functions and make the system independent first, and said that if QR becomes hard the team should skip it for now (Issues-and-TODOs, "Professor consultation"). The QR Digital Health ID module (ADR-002, ADR-023) and the CLINIQ-generated Student Number `YYYY-NNNNN` (ADR-005) were built together: the number is what the QR sticker encodes, what the PE Instructor scans or types, and the identifier that multi-student lists show instead of a name (ADR-004, ADR-010).

Asked what then identifies a student, and whether it should be the school's own ID number, Zean answered that the school already runs its own NFC ID system but it belongs to another company, so CLINIQ will be independent and will not use any data from it.

## Decision
1. **The QR feature is dropped**: QR sticker printing, the phone scan/lookup hub (`/qr/scan`), the Instructor's scan path, and the QR libraries. It is kept only as a future note (see Consequences).
2. **The CLINIQ Student Number is dropped.** CLINIQ no longer generates `YYYY-NNNNN`, and it is no longer the identifier shown on lists, in audit entries or on printouts.
3. **Students are identified mostly by name.** The **LRN** (Learner Reference Number) may also be used where an identifier is needed. Zean's words: "LRN can be used too then Student name, but mostly student name."
4. **CLINIQ is independent.** It takes no number and no data from the school's existing NFC ID system. (This closes the "independent first" question from the professor consultation.)

**Not decided here** (each is an open `DECIDE` in Issues-and-TODOs.md, section "Professor consultation and team meeting, October 16"): how display privacy works once names appear on lists; whether and how the LRN is collected and shown; how two students with the same name are told apart; how the PE/Sports Instructor looks up a student on a phone; and what happens to the non-QR pieces that live in the QR hub (the phone Emergency button).

## Alternatives Considered
- **Keep a number, but the school's own ID number or LRN** as the display identifier, so ADR-004 (no names on multi-student lists) would still hold. Offered to Zean; not chosen as the main identifier (the LRN may still be used).
- **Show names everywhere.** Closest to what was chosen ("mostly student name"); it changes ADR-004 and ADR-010, so the replacement rule must be written before the code changes.
- **Defer QR instead of dropping it** (the professor's "if it's hard, skip it for now"). Superseded by Zean's decision to drop it.

## Consequences
- **Superseded:** ADR-002 (QR hub), ADR-005 (Student Number format), ADR-023 (QR mobile-only). **Amended:** ADR-004 and ADR-010 no longer hold for multi-student lists once this is built; ADR-003's Instructor scan/enter path ends. Each carries a pointer to this ADR. Other ADRs that mention QR or the Student Number and need a read-through when this is built: 007, 008, 009, 011, 012, 014, 015, 016, 017, 018, 022, 024, 026 (audit entries and printouts name a record by Student Number and time today).
- **Until it is built, the app still has QR and Student Numbers**, and ADR-002, ADR-004, ADR-005, ADR-010 and ADR-023 still describe what the code does. The `cliniq-display-privacy` and `cliniq-audit-trail` skills stay as they are until the replacement rule is written. **Agents: do not start removing either one or changing how names are shown until Zean asks for it.**
- **Large reach:** about 640 references to `studentNumber` in 77 frontend source files, about 28 QR-related source files, the `qr-scanner` dependency, the ERD draft (`students.student_number`), the canonical documents, many knowledge-base documents and several skills. The to-do list is in Issues-and-TODOs.md.
- **Future note:** QR, or a link to an ID system, may be reconsidered later (a `LATER` entry). The removed code stays in git history; tag the last commit that has it before deleting.
- **Not decided here:** the display-privacy replacement rule, LRN handling, duplicate detection, the Instructor's lookup, and the fate of the phone Emergency button.

# ADR-054: The student's own number is dropped, an optional birthdate is added, and the age group follows the age

**Date:** Friday, October 30, 2026 — 21:14 PHT
**Status:** Accepted (Zean, in chat, Friday, October 30, 2026 — 21:03 PHT, with his answers to Claude's four questions the same evening). Amends ADR-049 (the "Student's mobile number") and ADR-051 (item 5, the age group for the usual vitals ranges). **Built** Saturday, October 31, 2026 — 00:07 PHT ([session](../08-Logs/Agent-Sessions/2026-10-31-student-birthdate-build.md)).

## Context
The school's masterlist has no column for a student's own phone number, but it has each student's birthdate. ADR-049 renamed "Student contact information" to "Student's mobile number" and made it optional. ADR-051 picked the age group for the usual vitals ranges from the grade level, because student records had no birth date. A field that the school's list can never fill would stay empty for every imported student, while the birthdate that the list does carry was thrown away.

## Decision
1. **The student's own number is removed** from the student record: from the Add/Edit Student form, the Student Profile and its printout, and from the stored data (`contactInfo` on a student; `contact_number` in the database design). Parents and guardians stay the way to reach a family, through the emergency contacts, which are unchanged. A staff member keeps their own number (an adult is reached directly). No record was ever "incomplete" for lacking the number, so completeness does not change.
2. **A student has an optional birthdate.** The yearly import (ADR-047) fills it from the masterlist when the list has it; a student added by hand (a late enrollee, say) can be saved without one. It must be a real date and cannot be in the future. Claude's starting rule, for Zean to confirm: when the age is more than 3 years away from the usual age for the grade (Kinder 5, Grade 1 6, and so on up to Grade 12 17), the form shows a soft note ("Age 15 is unusual for Grade 3. Check the birthdate.") and still saves, never blocks (ADR-018). Zean chose "optional" over "required".
3. **The age is calculated, never stored.** Whole years from the birthdate to the day it is asked about (today for the profile, the visit's or incident's own date for the vitals note), so it never goes stale and a late entry does not move the group.
4. **Where it shows.** The Student Profile header shows the age ("9 years"); the full birthdate shows only in the profile details, the Edit form and the profile printout (a single-student document, like the other profile fields; Claude's choice unless Zean objects). Lists, pickers, the Dashboard, reports and the other printouts never show it, in line with the display-privacy rule (ADR-004, ADR-040). The audit trail records a change to it by field name only, never the value, as for sex.
5. **The age group follows the age** (amends ADR-051 item 5). With a birthdate: under 6 is the Kinder group, 6 to 12 the Grades 1 to 6 group, 13 and over the Grades 7 to 12 group. With no birthdate the grade level picks the group as before; staff are adults. The usual ranges themselves do not change. The age bands are starting values for the nurse to confirm, like the ranges (ADR-051).
6. **The database design changes** for a later review: `students.birth_date DATE NULL` is added and `students.contact_number` is dropped. Claude does not edit `ERD.md`, `Data-Dictionary.md` or `Reference-Schema.sql`; the change is logged as a `DOC`.
7. **Not on the incident report yet.** A hospital-referral report could carry the age or birthdate later if the clinician asks (`LATER`).

## Alternatives Considered
- **Make the birthdate required.** Rejected by Zean: a late enrollee with no birthdate on hand could not be saved, and ADR-051 keeps the required mark for fields that truly block.
- **Keep both the number and the birthdate.** Rejected: the masterlist has no phone column, so the number would be empty for every imported student.
- **Keep the age group by grade.** Rejected by Zean: an older or younger student in a grade would get the wrong group, and the school already supplies the birthdate.
- **Show the birthdate wherever the student appears.** Rejected: it spreads a child's birthdate across lists and printouts.
- **Store the age.** Rejected: a stored age goes stale (the mock data layer stores raw facts only).

## Consequences
- One change to the app (`FIX`): remove the field, add the birthdate and the age, change the age group, with tests. The build prompt is `Prompt-Build-Student-Birthdate-Replaces-Own-Number-Oct30.md`.
- Two documents lag until updated (`DOC`): the database design files, and the vault copies and READMEs that mention the student's mobile number.
- Birthdate is personal data about minors. The Privacy Policy already lists date of birth; it should be checked when the build is done (`DOC`).
- The canonical documents were updated with this decision on the same date.
- Session: [2026-10-30-student-birthdate-replaces-own-number](../08-Logs/Agent-Sessions/2026-10-30-student-birthdate-replaces-own-number.md)

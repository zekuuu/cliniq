# Session: The student's own number is dropped and a birthdate is added (ADR-054)

**Date/Day/Time:** Friday, October 30, 2026 — 21:14 PHT
**Agent:** Claude (Sonnet 5.5), working in the Claude chat/cloud workspace on a clone of `main` at `54f8bfc`
**Task:** Record Zean's decision to drop the student's own phone number and add the birthdate, update the canonical documents, and write the build prompt.
**Status:** Completed (documents, records and prompt only; no code changed; nothing committed or pushed; the new and edited files are delivered as a zip)

## Prompt/Request
Zean, Friday, October 30, 2026 — 21:03 PHT: "In the masterlist the school gave us, there is no student contact information column I mean own number, but there is birthdate which is good to use for like determine age group. so meaning will be dropping the data of student's own number then adding birthdate." Claude asked four questions; Zean answered: the birthdate is optional; the age group follows the age with the grade as fallback; the age shows in the profile header and the date on the profile details and the Edit form; and he wanted all three outputs (the decision record with Issues entries, the build prompt, the canonical documents).

## Files Modified
- `06-Decisions/ADR-054-Student-Own-Number-Dropped-Birthdate-Added-Age-Group-By-Age.md` (new)
- `06-Decisions/ADR-049-...md` and `06-Decisions/ADR-051-...md` (one sentence each on the Status line: amended by ADR-054)
- `06-Decisions/Decisions-Summary.md` (ADR-054 entry)
- `09-References/Canonical-Documents/CLINIQ_Modules_and_Features.md`, `CLINIQ_Frontend_Context_Brief.md`, `CLINIQ_Frontend_Design_Reference.md`
- `08-Logs/Issues-and-TODOs.md`, `08-Logs/Changelog.md`
- Not touched: the Project Plan (it says nothing about the student's own number or the age group), `ERD.md`, `Data-Dictionary.md`, `Reference-Schema.sql`, the vault copies, the READMEs, code and tests.

## Changes Made
What the code does today (checked first): a student has `contactInfo`, shown as "Student's mobile number" on the form, the profile and the profile printout; student records have no birth date, so `ageGroupOf` in `lib/vitals.ts` picks the age group for the usual vitals ranges from the grade level. The database design also carries `contact_number` for students.

What was decided and written down:
1. The student's own number is removed (staff keep theirs; the emergency contacts are unchanged).
2. An optional birthdate is added, filled by the yearly import when the school's list has it. It must be a real date, not in the future. A soft note (never a block) appears when the age is more than 3 years from the usual age for the grade; that rule is Claude's starting value.
3. The age is calculated, never stored. The profile header shows the age; the date shows only in the profile details, the Edit form and the profile printout (the printout is Claude's choice unless Zean objects).
4. The age group follows the age on the visit's date (under 6, 6 to 12, 13 and over), falling back to the grade when there is no birthdate.
5. The database design changes (`birth_date DATE NULL` added, `contact_number` dropped) are logged as a `DOC`, not edited.

Issues: section "Birthdate instead of the student's own number" with a NOTE, 1 `FIX` (added to the open `FIX` list), 2 `DOC` (database design; vault copies, READMEs and the Privacy Policy) and 1 `LATER` (age on the hospital-referral incident report). Counts now: FIX 25, AUDIT 10, DOC 25, DECIDE 3, LATER 28, NOTE 77, VERIFY 25, Done 386.

Canonical documents: Modules & Features (the student's-number line replaced; a Birthdate bullet after Sex; the vitals age group; the yearly import fills the birthdate), Frontend Context Brief (Add/Edit Student, the Student entity, the Student Profile screen, the yearly import), Frontend Design Reference (Reference 3 header shows the age).

Build prompt: `Prompt-Build-Student-Birthdate-Replaces-Own-Number-Oct30.md`, one task with eight stated defaults (D1 to D8).

## Reason
The school's masterlist cannot fill a student's own number, but it carries the birthdate, which gives a better age group than the grade for the vitals ranges.

## Testing Performed
- Every scripted replacement asserted that its old text occurred exactly once.
- Counted the Issues file with the project's counting rule: the counts above; the archive was not changed (Done 386 still matches its DONE lines).
- Searched the canonical documents for leftover "mobile number" wording: none.
- Not done: no code was changed, so nothing was run; the build prompt itself was not tried on an agent.

## Known Issues
- The age bands (under 6, 6 to 12, 13 and over), the usual-age rule for the grade and the "3 years" threshold are Claude's starting values for the nurse and Zean to confirm.
- The profile printout carrying the full birthdate is Claude's choice; Zean can ask for the age only.
- The masterlist's real column layout was not seen; the yearly import is still blocked on the data privacy agreement.
- The Project Plan was not changed and its revision row stays 2.8.

## Next Steps
1. Zean applies the zip, then runs the build prompt (ideally on its own branch).
2. After the build, the `DOC` entries (database design files, vault copies, READMEs, Privacy Policy) are done by hand or by a follow-up.
3. Zean tells the nurse the age bands and asks whether the incident report should show the age.

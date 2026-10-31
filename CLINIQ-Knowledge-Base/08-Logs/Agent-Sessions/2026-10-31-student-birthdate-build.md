# Student birthdate build (ADR-054)

Date/Day/Time: Saturday, October 31, 2026 — 00:07 PHT
Agent: Claude Code (Opus 5.5)
Task: Remove the student's own number, add the optional birthdate and age, and pick the vitals age group by age.
Status: Completed
Prompt/Request: Zean's build prompt "Build: drop the student's own number, add the optional birthdate and age, and pick the vitals age group by age", on the branch `build/student-birthdate`, defaults D1 to D8 as given, no commit and no push.

## Files Modified

- Frontend: `lib/age.ts` and `lib/age.test.ts` (new), `features/student-records/Birthdate.test.tsx` (new), `types/entities.ts`, `lib/vitals.ts`, `lib/mock-db/` (`api.ts`, `index.ts`, `integrity.ts`, `mock-db.json`, `seed.ts`, `selectors.ts`, `store.ts`, `types.ts`, `README.md`), the Student Form, Profile and List pages and their `api/` modules, New Visit, Visit Details, the Incident form, `PrivacyPolicyPage.tsx`, `scripts/generate-load-data.mjs`, and the tests that named the removed field.
- Documents: root `README.md`, `features/student-records/README.md`, `Module-Overview.md`, `Screen-Inventory.md`, `Audit-Coverage.md`, `Privacy-Policy.md`, `cliniq-display-privacy` skill, ADR-054, Changelog, Issues-and-TODOs, Issues-Done-Archive.

## Changes Made

- `contactInfo` is gone from students (type, form, form API, profile, printout, seed, integrity, data layer); saved mock state is migrated. Staff keep theirs.
- `Student.birthDate` (`ISODate | null`, PROVISIONAL): optional on the form through `DatePicker`, refused in the form and the data layer when in the future, refused in the data layer when not a real date.
- `lib/age.ts`: `ageOn`, `ageText`, `usualAgeForGrade`, `unusualAgeNote`. The age is never stored.
- `ageGroupOf(patient, onDate, usual)`: by age with `vitalsUsualRanges.grades1to6FromAge` (6) and `grades7to12FromAge` (13), else by grade; staff are adults. Callers pass the visit's or incident's own date.
- `listStudents` and the Incomplete Records queue now return `StudentListRow` (`toStudentRow`), which has no `birthDate`.
- Seed: 46 of 52 students have a birthdate as `{ "daysAgo": n }`, which needed no extension to `relativeDates`; 6 have `null`.
- `config.unusualAgeYears` (3).

## Reason

The school's masterlist has no student phone number but has birthdates (ADR-054).

## Testing Performed

- Typecheck: clean before and after. Build: passes before and after. Lint: 1 error and 2 warnings before and after, all in files or lines this build did not cause (`NewVisitEntryPage.tsx:298`, refs during render).
- Tests, a clean export of the starting commit and this branch run the same way (`--maxWorkers=3 --testTimeout=30000`, Saturday, October 31, 2026, 00:00 to 00:06): 15 failed and 798 passed before; 14 failed and 824 passed after. Every failure after also fails before; none is new. At the default settings the count swings between 16 and 33 because of 5-second timeouts under load.
- Browser (Playwright with Chromium, outside the repository): Add Student, Edit Student with the note, Student Profile with and without a birthdate, its printout, New Visit and the Incident form with a vitals note, for Staff; the Student Profile for the Admin; 1440, 768 and 390 px. No horizontal scroll; the keyboard focus outline on the Birthdate field is fully visible. axe (WCAG A and AA): clean except the open `DatePicker` placeholder contrast `FIX`.

## Known Issues

- The New Visit form takes only a temperature, and temperature has one usual limit for every group, so the age group changes nothing visible there; it matters on the Incident form (pulse, blood pressure).
- The Privacy Policy lists "section", which student records do not hold, and "gender", where the record holds sex. Left as they are.
- Canonical `CLINIQ_Modules_and_Features.md` line 85 says a visit keeps the grade "and section"; the code keeps the grade only. Not edited.
- The `DOC` for `ERD.md`, `Data-Dictionary.md`, `ERD-3.2-Students.svg` and `Reference-Schema.sql` stays open.

## Next Steps

Zean reviews and commits on this branch. The nurse confirms the age limits and the unusual-age limit.

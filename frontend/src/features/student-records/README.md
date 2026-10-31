# Student Records

## What it is
Encoding, medical history, allergies, emergency contacts, the optional birthdate, the LRN, duplicate detection, archive/deactivate. See CLINIQ-Knowledge-Base/01-Requirements/Features/Module-Overview.md.

## Screens and who can use them
- Student List and Student Profile: School Clinician and Admin / Principal (reads only, ADR-038).
- Add / Edit Student and Incomplete Records: School Clinician only.

## Rules that matter
- The LRN is entered by the School Clinician, unique, and masked on lists (ADR-028); single-student screens and printouts show it in full (ADR-040).
- Multi-student screens never show a name (ADR-004), except the Student List and Staff List, which are deliberate masterlists.
- Section is optional (ADR-047); a visit or incident keeps the section it had when saved.
- Empty allergies and conditions read "None recorded" (ADR-049, ADR-051).
- A student has no own number; the optional birthdate gives the age in the Profile header, and the full date shows only in the profile details, the Edit form and the printout (ADR-054).

## Data and API files
`api/studentListApi.ts`, `api/studentProfileApi.ts`, `api/studentFormApi.ts`, `api/incompleteRecordsApi.ts`.

## Printouts and tests
The Student Profile prints a "Student Health Record" sheet with the whole visit and incident history (the screen lists the eight most recent) (ADR-026). Tests: the `*.test.tsx` files in this folder.

## Not built yet
Decided, not built:
- Grade and section from a yearly import of the registrar's list; students missing from it are archived after a review list, and records are kept 5 years from the archive date (ADR-047, ADR-051).

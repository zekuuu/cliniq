# Staff Patients

## What it is

Teachers, non-teaching staff and utility workers seen at the clinic (ADR-043). In code the entity is `Personnel` ("Staff" was already used for the clinician role in older documents); on screen it is Staff. See CLINIQ-Knowledge-Base/01-Requirements/Features/Module-Overview.md, section 2a.

## Screens and who can use them

Staff List, Staff Profile and Add / Edit Staff: School Clinician only. The Admin / Principal has no Staff item and is redirected from `/staff`.

## Rules that matter

- The staff types end with "Other", and a staff visit can end in "Returned to work" (ADR-053).
- Lists elsewhere show the Staff No., never the name (`cliniq-display-privacy`).
- The Staff Profile's Record a visit and Record an incident open the form with the staff member chosen (`?staff=`).

## Data and API files

`api/staffApi.ts`; the staff types are in `config.personnelTypes` in `lib/mock-db/mock-db.json`.

## Printouts and tests

No printout. Tests: `StaffPages.test.tsx`; also `features/staff-patients.test.tsx` and `features/staff-counts.test.tsx`.

## Not built yet

Decided, not built:

- Nothing in the frontend. The two patient tables (ADR-053) are in the approved ERD (ADR-057) and the B1 migrations; Import Staff List (ADR-069) and Incomplete Staff Records (ADR-067) are built.

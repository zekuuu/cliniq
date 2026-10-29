# Clinic Visit Monitoring

## What it is
Daily visit logging, excuse letters, PE/Sports referrals, and Follow-Up Handling (shared with emergency-response). See the Modules & Features canonical doc.

## Screens and who can use them
All School Clinician only: New Visit (with the first-aid checklist, shown when the complaint matches a predefined type), Visit Log, Visit Details, Excuse Letter, PE/Sports Injury Referral.

## Rules that matter
- Medicines and supplies given come out of real stock (ADR-018).
- Visits and incidents stay separate; Visit Details has "Escalate to incident" (ADR-036).
- Cancel asks before discarding unsaved input (ADR-021).
- A visit can be about a student or a staff patient (ADR-043); lists show the masked LRN or the Staff No., never a name (ADR-004).
- The visit also takes five optional fields from the clinic's daily logbook (body temperature, time out, assisted by, parent/guardian, remarks), in a collapsed "Show more fields" section on New Visit and the edit form (`LogbookFields.tsx`, values in `logbookValues.ts`). Visit Details shows the filled ones (Time out with the visit's date); the Visit Log table and printed pages don't show them. "Assisted by" is a `Combobox` of active account names that accepts free text (`fetchAssistedByNames`); New Visit prefills Parent or guardian from the primary emergency contact when it is empty (Sir Rey, Sunday, October 25, 2026).

## Data and API files
`api/newVisitApi.ts`, `api/visitLogApi.ts`, `api/visitDetailApi.ts`, `api/excuseLetterApi.ts`, `api/peReferralApi.ts`; values in `dispositionValues.ts` and `logbookValues.ts`.

## Printouts and tests
The Excuse Letter prints as an A4 letter with letterhead, signature block, and a reference block; only an approved, superseded or void letter prints (the last two stamped SUPERSEDED or VOID); a draft stays on screen with Print disabled ("Approve the letter to print it.", ADR-038 item 6). Tests: the `*.test.tsx` files in this folder.

## Not built yet
Decided, not built:
- "Save and approve now" on an Excuse Letter, a warning past 3 days, the approved wording stored, and the optional collected-by and stay-home fields (ADR-049).
- Each visit keeps the grade and section it had when saved (ADR-047).
- Up to 3 extra complaint tags on a visit, and "Returned to work" for staff (ADR-053).
- Common vitals ranges as warnings, and the required mark only where saving is blocked (ADR-051).

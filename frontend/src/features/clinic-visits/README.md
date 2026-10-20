Clinic Visit Monitoring — daily visit logging, excuse letters, PE/Sports referrals, and Follow-Up Handling (shared with emergency-response). See Modules & Features canonical doc.

The Excuse Letter prints as an A4 letter with letterhead, signature block, and a reference block; an unapproved draft prints with a DRAFT mark (ADR-026).

The visit also takes five optional fields from the clinic's daily logbook (body temperature, time out, assisted by, parent/guardian, remarks), in a collapsed "Show more fields" section on New Visit and the edit form (`LogbookFields.tsx`, values in `logbookValues.ts`). Visit Detail shows the filled ones; the Visit Log table and printed pages don't show them.

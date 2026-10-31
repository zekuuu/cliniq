# ERD Review

**Status: first list, for the team's approval.** Written Saturday, October 31, 2026 — 19:46 PHT from the documentation accuracy pass, against the code at `9b4861db` plus that pass's changes. `ERD.md`, `Data-Dictionary.md`, `Reference-Schema.sql` and the `Diagrams/ERD-*` files are not edited until Zean approves these changes (ADR-056). Part 1 of the backend preparation continues this review function by function against the mock API.

## Missing from all three files

| What the system has | Decision | Where in the code |
|---|---|---|
| Staff patients: their own table; visits, incidents, follow-ups and stock transactions point at a student or a staff member, exactly one | ADR-043, ADR-053 | `Personnel`, `PatientRef` |
| `students.student_id` is `NOT NULL` on `visits`, `incidents`, `follow_ups`; composite keys `(id, student_id)` must allow for a staff patient | ADR-043 | Same |
| Inventory batches: quantity, expiry and received date per batch, with allocations per movement. `inventory_items` still holds one `expiration_date` | ADR-030, ADR-035 | `InventoryItem.batches`, `InventoryBatchAllocation` |
| `birth_date` on students; `contact_number` dropped | ADR-054 | `Student.birthDate` |
| `section` on students; grade and section at the time on visits and incidents | ADR-047 | `Student.section`, `gradeLevelAtTime`, `sectionAtTime` |
| Disposition `resting_in_clinic`; `chk_visits_disposition` needs checking against it | Panel review VS-1 | `lib/dispositions.ts` |
| Up to 3 extra complaint tags on a visit | ADR-053 | `Visit.extraComplaints` |
| Collected by, relationship, time collected | ADR-049 | `Visit.collectedBy` |
| Stay home until cleared, on follow-ups and letters | ADR-049 | `FollowUp.stayHomeUntilCleared`, `stayHomeNote` |
| Stored letter wording (`recipient`, `body`), superseded and voided letters. `uq_letters_visit` allows one letter per visit, but a replacement needs several | ADR-049, panel review EX-3 | `ExcuseLetterApproval` |
| Avoid-if-allergic words on an item; generic or branded | ADR-049 | `InventoryItem.avoidIfAllergicTo`, `brand` |
| Acknowledge on an incident report | ADR-048 | `Incident.acknowledged` |
| Backup locations; a backup result per location | ADR-052 | `BackupLocation` |

## Wording in the drafts

- `ERD.md` and `Data-Dictionary.md` name the module `SmartTriage`; the feature is the First-aid Checklist. `ERD.md` says the backend README lacks it, and the module list has no staff-patient module.
- `ERD.md` section 14 says "the 64 mock functions" (103 now), and asks for "MySQL" wording changes that are done.
- `Data-Dictionary.md`'s frontend line for students lists `contactInfo`.
- 29 table-of-contents anchors in `Data-Dictionary.md` do not resolve.
- Diagrams need regenerating after any of the above.

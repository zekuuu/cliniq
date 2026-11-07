> **Note Saturday, November 07, 2026 — 16:15 PHT:** The backend stores the staff review queue (item 6) in its own table, `staff_record_reviews`, [ADR-076](ADR-076-Staff-Record-Reviews-In-Their-Own-Table.md). The decision text below is unchanged.

# ADR-067: Staff records have a record status and their own Incomplete Records page

**Date:** Thursday, November 05, 2026 — 21:19 PHT
**Status:** Accepted (Zean, in chat, Thursday, November 5, 2026: "I'll let you decide, but it's mostly similar to students"). Amends ADR-043 item 3 ("no incomplete-records status"). Revised Thursday, November 05, 2026 — 21:33 PHT: Zean asked for a staff Incomplete Records page like the student queue, with a resolve step (items 3, 4 and 6).

## Context
A user asked for the Student List's "Incomplete records" button on the Staff List too ("what if kulang info nila"). ADR-043 gave staff no incomplete-records status, and the Staff form already requires name, sex and type, so nothing could count as missing. Zean left the definition to the agent, "mostly similar to students".

## Decision
1. **A staff record is incomplete when it has no emergency contact, or no sex** (only records saved before ADR-063). Shared check: `missingStaffFields` (frontend/src/features/staff-records/missingStaffFields.ts). Staff have no birthdate field, so it isn't counted.
2. **Saving never blocks on these,** as for students (ADR-054): the emergency contact stays optional on the form.
3. **The Staff List gets a Record status column (Complete / Incomplete) and filter,** as on the Student List, and an **"Incomplete records (N)"** button that opens the staff Incomplete Records page (N = its open rows). Filtered to Incomplete, the list also shows Missing fields and Edit Record.
4. **Staff Incomplete Records page (`/staff/incomplete`),** the student queue's layout: open and resolved counts, a "Review queue" card, All / Open / Resolved (default Open), search by name, Staff No. or type, and Staff, Staff No., Type, Missing fields (the queue's soft warning badges), Resolution and Edit Record. No Imported column. Edit Record returns to the page after a save (`returnTo`).
5. **Edit Staff marks what's missing in red** ("Missing. Fill this in to complete the record.") until filled, and opens on the first missing field, as Edit Student does.
6. **A record is resolved when Edit Staff saves it complete,** recording who and when (`frontendOnly.personnelReviews`, like the students' `recordReviews` without the import fields). A resolved row stays under Resolved.

## Alternatives Considered
- Keep ADR-043 (no button): rejected; users asked for it.
- Only a filter on the Staff List, with no page and no resolve step: the first version, replaced at Zean's request.
- Contact number as a required-for-completion field: not chosen; the student check doesn't count the student's own number either.

## Consequences
- The canonical Modules & Features document's Staff Patients section needs the record status and filter (flagged, not edited here).
- Backend: the staff list endpoint can derive the status the same way; the resolution needs a stored row per staff record (who, when), like the student review rows. Check the ERD.
- Session: [2026-11-05-staff-record-status](../08-Logs/Agent-Sessions/2026-11-05-staff-record-status.md)

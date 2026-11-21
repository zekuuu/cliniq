# ADR-086: A search box in the top bar finds a student or staff member and opens the profile

**Date:** Sunday, November 22, 2026 — 01:59 PHT
**Status:** Accepted (Zean, Sunday, November 22, 2026: "I'm thinking about adding another search field on topbar", then "do it" to the proposal: students and staff by name, LRN or Staff No.; scoped by role; masked LRN in results; picking opens the profile; reuses the existing patient search.)
**Amends:** the App Shell's "no search box" note (`frontend/src/layouts/AppShell.tsx`). **Builds on:** [ADR-043](ADR-043-Teachers-And-School-Staff-Are-Clinic-Patients-With-Their-Own-Screens.md) (the one patient search) and [ADR-082](ADR-082-Server-Side-Pagination-Of-The-Long-Lists-And-TanStack-Query.md) (the 250 ms typing pause).

## Context
- Reaching one person's profile took a trip to the Student List or the Staff List and a search there.
- New Visit, New Incident and Dispense already have one search for students and staff (`POST /api/patients/search`, ADR-043): at most 8 active people, masked numbers, nothing medical.

## Decision
1. **Staff get a search box in the top bar**, between the clock and the account menu, labelled "Search students and staff" for screen readers, with a search icon and the placeholder "Search LRN, Staff No. or name".
2. **It is the patient search of New Visit** (`usePatientSearch`): results once typing pauses for 250 ms, at most 8 active students and staff, each with the masked LRN or the Staff No., the grade or staff type and a Student or Staff label (cliniq-display-privacy). Nothing medical.
3. **Picking a result opens that person's profile** (`/students/:id` or `/staff/:id`) and empties the box.
4. **The Admin gets no box**: the patient search is a Staff-only route (`role:staff`), and the Admin's screens don't show patient records.
5. **It shows from the `xl` width (1280 px) up**, where the top bar has room beside the clock and the account menu. Below that every list keeps its own search.
6. **No new API route and no backend change.**

## Consequences
- Archived records are not found here (the patient search lists active people only); they stay on the Archive screen.
- `Combobox` gains `hideLabel` (label kept for screen readers only); the icon set gains `search`.

## Canonical documents to update
Frontend Context Brief and Frontend Design Reference (the App Shell's top bar now has a Staff search).

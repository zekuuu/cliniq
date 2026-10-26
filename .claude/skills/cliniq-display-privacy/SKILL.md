---
name: cliniq-display-privacy
description: Apply whenever building or reviewing any screen that displays a student — lists, tables, dashboard widgets, cards, or detail views. Determines whether to show the student's full name or their masked LRN, and when the full LRN may appear.
---

# CLINIQ Display-Privacy Rule

CLINIQ's screen-context display rule (Modules & Features, cross-cutting; ADR-004) exists because a bystander glancing at an open desktop screen can attach a specific, identifiable student to a health pattern. This is a real project requirement, not a style preference — apply it to every new screen without being asked.

## The rule

**Multi-student list/aggregate views → masked LRN, never the name.**
Any screen showing more than one student at a glance: visit logs, incident logs, the Dashboard's frequent-visitor section, any future list view. These are the screens someone could walk past and read.

**The LRN itself is shown masked almost everywhere (ADR-028).** The LRN links to school and DepEd records, so it is more revealing than the old CLINIQ Student Number. Lists, pickers (including the picked-student chip), the Dashboard, Reports and their printouts, and the Audit Trail show only its last four digits. Exceptions: the Dashboard's printout (Clinic Overview Report) and the Monthly Report printouts (incident table, Incident register) print the full LRN, with no names, while the Dashboard and Reports screens stay masked (ADR-044, Zean, Monday, October 26, 2026; amended 14:43) (`●●●●●●●●1234`, read to screen readers as "LRN ending in 1234"). The full LRN appears on every screen about one deliberately opened student and on that screen's printout. These are the Student Profile and Student Health Record, the Incident Report, Parent Notifications, the Excuse Letter, Visit Details, the entry-form headers once a student is picked, and the Add/Edit Student form (ADR-040, Zean, Sunday, October 25, 2026). Never put an LRN in an address, query string, browser tab title or audit entry: routes carry the internal student id. Format it only through `frontend/src/lib/lrn.ts` (`maskLrn`, `lrnLabel`) and `<MaskedLrn>` (`components/ui/MaskedLrn.tsx`); no screen formats it by hand.

**Single deliberate lookups → full name is correct and expected.**
The full Student Profile, search results, the masterlist/student directory. Someone has already identified and is looking at one specific student for a legitimate reason — hiding the name here would be unhelpful, not safer.

**The masterlist is a special case:** show full names freely (it's just a roster of who's enrolled — low sensitivity), but never show medical/confidential fields inline in that list. Allergies, conditions, visit reasons, or anything else diagnostic still requires opening the individual profile.

**Staff patients use the Staff No. the same way (ADR-043).** A teacher or school staff member seen at the clinic appears on every multi-person list by their **Staff No.** (`STF-0007`), never the name, with a small Student or Staff chip so the two kinds read apart (`<PatientNumber>`, `components/ui/PatientNumber.tsx`; text through `lib/patients.ts`). The Staff No. is not masked: it is assigned by CLINIQ and links to no outside record. The Staff Profile, Visit Details and Incident Report of a staff member show the name, like a student's. The Staff List is a masterlist, so it shows names and nothing medical.

## Applying it to a new screen

Ask one question: **does this screen show one specific student the user has already identified, or a set of multiple students at once?**
- One student, deliberately opened → name.
- Multiple students, glanceable → masked LRN.

If you're building something that doesn't cleanly fit either case, don't guess — flag it and ask. The two cases below were flagged that way and are now decided; apply them, don't re-open them.

## Decided: reasons and complaints stay visible in list rows (ADR-010)

The rule hides **names**, not reasons. In a multi-student list the visit's complaint, the incident's description, and the follow-up's reason stay visible next to the masked LRN (`06-Decisions/ADR-010-Reason-Visibility-in-List-Rows.md`, Option A). This applies to the Visit Log List, Incident Log List, Follow-Up List, and the Dashboard alert lists. Do not genericize a complaint to "Visit recorded".

## Decided edge case: the Incomplete Records queue shows full names

The Incomplete Records queue (Screen #9) lists several students at once and still shows **full names**. It is a missing-paperwork queue, not a health-information screen: each row says which registration field is missing (an emergency contact, a phone number), never anything about a visit, complaint, allergy, or condition. That puts it next to the masterlist in sensitivity, and Staff need the name to chase the paperwork. Decided by the project owner on Wednesday, September 30, 2026.

Use the same test for a similar screen: a multi-student list may show names only when it carries **no medical or visit information at all**. The moment a row shows anything diagnostic, it takes the masked LRN.

## Decided exception: the Sports Report shows full names (ADR-034)

The Sports Report (Reports > Sports Reports, Staff only) lists several students by **full name and grade level**, and its printout carries their recent visits and incidents. This is a decided exception to the masked-LRN rule, because the PE or sports instructor who receives the printout has to recognise the students (ADR-034, Zean, Wednesday, October 21, 2026). It holds only inside that feature: the builder, its preview and its printout. The student picker in the builder still shows the masked LRN, the saved-reports list names reports (never students), and the Audit Trail names the report and a student count, never a student. Do not copy this exception to any other list, picker or printout. Built Wednesday, October 21, 2026 — 07:23.

## Where this has already been applied correctly

Reference these as the working pattern: the Visit Log List, Incident Log List, Follow-Up List, Audit Log, and Dashboard alert lists (masked LRN, with the reason visible); the Student Profile, masterlist, and Incomplete Records queue (full name). See `CLINIQ-Knowledge-Base/01-Requirements/User-Roles-and-Permissions.md` for the full rule text.

---
name: cliniq-display-privacy
description: Apply whenever building or reviewing any screen that displays a student — lists, tables, dashboard widgets, cards, or detail views. Determines whether to show the student's full name or their Student Number.
---

# CLINIQ Display-Privacy Rule

CLINIQ's screen-context display rule (Modules & Features, cross-cutting; ADR-004) exists because a bystander glancing at an open desktop screen can attach a specific, identifiable student to a health pattern. This is a real project requirement, not a style preference — apply it to every new screen without being asked.

## The rule

**Multi-student list/aggregate views → Student Number, never the name.**
Any screen showing more than one student at a glance: visit logs, incident logs, the Dashboard's frequent-visitor section, any future list view. These are the screens someone could walk past and read.

**Single deliberate lookups → full name is correct and expected.**
The full Student Profile, search results, the masterlist/student directory. Someone has already identified and is looking at one specific student for a legitimate reason — hiding the name here would be unhelpful, not safer.

**The masterlist is a special case:** show full names freely (it's just a roster of who's enrolled — low sensitivity), but never show medical/confidential fields inline in that list. Allergies, conditions, visit reasons, or anything else diagnostic still requires opening the individual profile.

## Applying it to a new screen

Ask one question: **does this screen show one specific student the user has already identified, or a set of multiple students at once?**
- One student, deliberately opened → name.
- Multiple students, glanceable → Student Number.

If you're building something that doesn't cleanly fit either case, don't guess — flag it and ask. The two cases below were flagged that way and are now decided; apply them, don't re-open them.

## Decided: reasons and complaints stay visible in list rows (ADR-010)

The rule hides **names**, not reasons. In a multi-student list the visit's complaint, the incident's description, and the follow-up's reason stay visible next to the Student Number (`06-Decisions/ADR-010-Reason-Visibility-in-List-Rows.md`, Option A). This applies to the Visit Log List, Incident Log List, Follow-Up List, and the Dashboard alert lists. Do not genericize a complaint to "Visit recorded".

## Decided edge case: the Incomplete Records queue shows full names

The Incomplete Records queue (Screen #9) lists several students at once and still shows **full names**. It is a missing-paperwork queue, not a health-information screen: each row says which registration field is missing (an emergency contact, a phone number), never anything about a visit, complaint, allergy, or condition. That puts it next to the masterlist in sensitivity, and Staff need the name to chase the paperwork. Decided by the project owner on Wednesday, September 30, 2026.

Use the same test for a similar screen: a multi-student list may show names only when it carries **no medical or visit information at all**. The moment a row shows anything diagnostic, it takes the Student Number.

## Where this has already been applied correctly

Reference these as the working pattern: the Visit Log List, Incident Log List, Follow-Up List, Audit Log, and Dashboard alert lists (Student Number, with the reason visible); the Student Profile, masterlist, and Incomplete Records queue (full name). See `CLINIQ-Knowledge-Base/01-Requirements/User-Roles-and-Permissions.md` for the full rule text.

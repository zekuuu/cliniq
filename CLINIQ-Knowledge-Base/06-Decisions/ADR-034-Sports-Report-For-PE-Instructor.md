# ADR-034: The Sports Report: a Saved, Clinician-Built Student List with a Printout for the PE Instructor

**Date:** Wednesday, October 21, 2026 — 00:28
**Status:** Accepted (requested by Zean after a design discussion; recorded only: **nothing is built yet**; the Instructor role it replaces was removed Wednesday, October 21, 2026 — 01:47, [2026-10-21-remove-phone-screens-and-instructor](../08-Logs/Agent-Sessions/2026-10-21-remove-phone-screens-and-instructor.md)). What the nurse and the Principal agree to release is **not** yet confirmed, see "Not decided here".

## Context
ADR-029 removed the PE/Sports Instructor's direct access: an instructor asks the clinician, who prints health information, and left open what the printout holds and how the clinician builds it. The Principal's reason for the role was that an injured student must not be allowed to play. A printout is a snapshot and does not cover an injury that happened today.

Zean's plan, in his words (Wednesday, October 21, 2026): the instructor comes to the clinic and asks for a sports report; the clinician opens a sports report page and adds the students the instructor listed (for example the players of an event); when printed, the report carries each student's at least recent medical history or incident history, such as injuries.

## Decision
1. **A Sports Report is a saved, reusable and editable list of students**, built by the clinician for a PE or sports activity. It has a title, the activity, who requested it (the instructor's name), the students, an optional note per student and two options: a look-back window and "include recorded conditions".
2. **Students are added one by one or as a whole grade level**, and shown with their **full name and grade level**. This is a deliberate **exception to ADR-004 and ADR-028** (lists show the LRN instead of the name): the report only works if the instructor can recognize the students.
3. **The printout (A4, ADR-026)** shows, per student: the visits and incidents in the look-back window (date, what happened, outcome, newest first), the clinician's note and, only if ticked, the student's recorded conditions and allergies. A student with no entries says "No visits or incidents recorded in this period". It has an "as of" date and time, the window, who requested it, who printed it, a confidentiality line (for the named instructor only; shows only what CLINIQ recorded; not a medical clearance) and signature lines for the clinician and the receiving instructor.
4. **Look-back window:** 30, 60 or 90 days or the school year; default **90 days**.
5. **Conditions are an option, off by default.** The report never prints treatment notes, remarks, vitals, medicines given, parent or guardian names, contacts or the LRN.
6. **Saved lists store only the list and the notes, not a copy of the medical content.** The content is computed when the report is printed, so a reprint is current and nobody keeps an old copy of sensitive data.
7. **Staff only (the clinician).** The Admin/Principal cannot open it, and there is no Instructor account. **Creating, editing, archiving and printing are audited** (a print entry names the report and the number of students, not the students).
8. **Per-student note:** a free-text box the clinician fills in, per report; it prints beside the student; the system never decides or prints "fit to play".
9. **Duplicate** (copy a saved report for next year's event) is part of the first version.

## Not decided here (open `DECIDE` entries)
- Whether the nurse and the Principal agree to what is released, above all the conditions option (the school's privacy practice for giving a minor's health information to a teacher; the registrar is the privacy officer).
- Whether every visit and incident prints or only injuries (the complaint is free text, so the first version prints all).
- Whether an entry older than the window should still print while its follow-up is open.
- How an instructor hears of an injury that happened today (a printout is a snapshot).
- How long a printout stays valid.

## Alternatives Considered
- **LRN instead of names on the printout** (the display-privacy rule). Rejected: the instructor cannot tell students apart by a masked number.
- **The student's full medical history.** Rejected: the minimum needed; only visits, incidents and the clinician's note by default.
- **A system-set "fit to play" status.** Rejected: a medical judgment; the clinician's note says it in her words.
- **An instructor account** (ADR-029). Not reopened.
- **A one-time, non-saved list.** Rejected by Zean: the lists are reused and edited.

## Consequences
- **New document in ADR-026's list** (the Sports Report) and a new screen set under Reports (a list of saved reports, the builder, the printout), Staff only.
- **The `cliniq-display-privacy` skill and ADR-004 get an exception** for this report, pointing here.
- **The ERD draft** gains a sports report table and its students and notes (a list, not clinical data); the content comes from visits and incidents.
- **Releasing health information of minors to a third person** is a privacy matter under RA 10173 (purpose, minimum necessary, consent). Until the nurse and the Principal confirm, treat the report as a draft and keep the conditions option off by default.
- **Until it is built nothing changes in the app.** The prompt is part 6 of `Prompt-Build-Removals-QR-LRN-Mobile-Instructor-UserMgmt.md`, run after the LRN part.

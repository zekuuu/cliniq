# ADR-038: Admin gets read-only access to student profiles and incidents, Admin cannot print, and a draft excuse letter cannot be printed

**Date:** Sunday, October 25, 2026 — 16:58 PHT
**Status:** Accepted (Zean, Sunday, October 25, 2026 — 16:45). Built: items 1 to 6 (parts 1 and 5 of `Prompt-Build-Professor-Feedback-Mina-Rey-Oct25.md`), Built Sunday, October 25, 2026 — 21:57 PHT ([2026-10-25-mina-rey-feedback-build-all-parts](../08-Logs/Agent-Sessions/2026-10-25-mina-rey-feedback-build-all-parts.md)). Item 4 (the audit of Admin views) is built as the default and still awaits Zean's confirmation.

## Context
Two more professors reviewed CLINIQ (Sir Mina and Sir Rey). Sir Mina said the Admin/Principal should at least have the clinician's features, because someone who oversees and maintains the system must be able to see the same records, and suggested a Super Admin above the Principal. Sir Rey said a report that is not approved should not be printable, to save paper, and that the screens show too much.

Today the Admin can open only the Dashboard, the Calendar, Reports, the Audit Log, Backup, the Privacy Policy and the user-management screens (ADR-033, ADR-037); the Student List, Student Profile and Incident screens are Staff only. The Admin can print the Dashboard's Clinic Overview Report and the Reports page documents (ADR-026, ADR-029). Zean answered: yes to read-only access to incidents and profiles; on the Reports page, no printing for the Admin, "since the clinician will be the one submitting and printing it".

## Decision
1. **The Admin can open, read only: the Student List, the Student Profile (allergies, conditions, emergency contacts, and the list of visits and incidents), the Incident Log and the Incident Report.** The display rules stay the same as for Staff (ADR-004: lists show the masked LRN).
2. **Read only means no write control anywhere on those screens:** no Add or Edit Student, no archive, no New Visit, no excuse letter, no New Incident, no Stage 2, no notification logging, no approval. A control the Admin cannot use is not shown.
3. **The Admin cannot print or Save as PDF anywhere.** The print buttons on the Dashboard (Clinic Overview Report) and on the Reports page are disabled with a short line saying that the clinician prints. The Principal reads reports on screen or receives the clinician's printout. This changes ADR-029 item 2 (the Principal "reads the Dashboard and the printable report"): the report is read on screen. The browser's own print menu cannot be fully blocked in a web app; the rule covers every print action and shortcut the app provides.
4. **Default, to confirm: every time the Admin opens a student profile or an incident report, the audit log records who, what and when.** The Admin is not a clinician, so this is the exceptional access. Whether the clinician's own views are logged stays the open `DECIDE` "Should opening a health record be audit-logged?".
5. **Visits on a student profile appear as text for the Admin, not as links.** The Visit Log and Visit Details stay Staff only. Not asked by the reviewers; a default that can be widened later.
6. **A draft excuse letter cannot be printed or saved as PDF until it is approved.** It stays visible on screen. A superseded or voided letter still prints stamped SUPERSEDED or VOID (as built). This replaces the printed DRAFT mark in ADR-026, which can no longer occur.
7. **No Super Admin role.** The Admin already manages accounts, reads the Audit Log and runs Backup, which is the maintenance and oversight Sir Mina asked for.

## Alternatives Considered
- **Admin gets every clinician feature (Sir Mina).** Rejected: a non-clinician could then edit health records and dispense medicine, and the audit log would stop showing who is clinically responsible. Read-only gives the oversight without that.
- **A Super Admin above the Principal.** Rejected: the school has no IT staff and one clinic computer, so one more role is one more account and password to lose, with nobody to hold it.
- **Admin prints totals only (no student names).** Offered to Zean; he chose no printing at all.
- **Keep printing drafts with a DRAFT mark.** Rejected after Sir Rey's comment: it wastes paper and puts an unapproved letter in someone's hands.

## Consequences
- Route roles change for the Student List, Student Profile, Incident Log and Incident Report; the Admin sidebar gains Students and Incidents entries; the role matrix document lists the new access.
- ADR-029 gets a note (item 3). ADR-026 gets a note (item 6). ADR-033 and ADR-037 are unchanged.
- The open `DECIDE` entries "Ask the Principal whether the printable monthly report is all the Principal needs", "Ask the Principal what he wants to see...", "Does the Principal acknowledge an incident report?" and "How does the Principal's sign-in work on a shared clinic computer?" each carry an update. The Principal can now read an incident report, but whether he acknowledges it is still open.
- The Principal has not been told that he will not print; the clinician hands him the printout.
- Session: [2026-10-25-mina-rey-feedback-triage-and-build-prompt](../08-Logs/Agent-Sessions/2026-10-25-mina-rey-feedback-triage-and-build-prompt.md)

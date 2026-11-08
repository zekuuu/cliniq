# UI/UX Follow-ups Backlog Entry

Date/Day/Time: Monday, September 28, 2026 — 08:17
Agent: Codex
Task: Add the user's reported QR, student-records, dashboard, visit/incident, parent-notification, and Stage 1 fixes/bugs to the project backlog.
Status: Completed
Prompt/Request: “for fixes or bugs can you please input these also” followed by the listed QR, Student Records, Dashboard, Student List, Incident/Visit, Parent Notification, and Stage 1 items.
Files Modified:
- `CLINIQ-Knowledge-Base/08-Logs/Frontend-Issues-and-TODOs.md`
- `CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md`
- `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-09-28-ui-ux-followups.md`
Changes Made:
- Added the reported UI/UX follow-ups as an actionable backlog section.
- Confirmed and described current gaps: manual Student Number input does not add its dash; Student List has no profile action; Dashboard alert rows do not navigate; Parent Notification Log lacks emergency-contact context; and Incident Stage 1 lacks General Notes and has an inert Cancel button.
- Kept QR alignment, optional/complaint-dependent fields, archive-table geometry, and the requested meaning of “independent” visit/incident entry as validation tasks where the implementation target is not sufficiently specific to infer safely.
Reason:
- Preserve the user's feedback as project context and prevent unverified assumptions from becoming untracked implementation changes.
Testing Performed:
- Read-only route, component, and mock-data review. No implementation changes or runtime tests were performed.
Known Issues:
- All newly recorded items remain open.
Next Steps:
- Prioritize and implement each confirmed gap with focused regression tests.
- Confirm the intended conditional fields and independent-entry behavior with the project owner before implementing those ambiguous items.

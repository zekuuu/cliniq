Date/Day/Time: Sunday, October 25, 2026 — 22:33 PHT
Agent: Claude Code (Claude Opus 5.5)
Task: Show the full LRN on single-student screens and their printouts
Status: Completed
Prompt/Request: Zean: "Then now when opening like a student profile, printing, etc. LRN are still censored when it shouldn't be". This reversed part of ADR-028, so I asked about the scope first; Zean chose "Single-student screens + their prints".
Files Modified: frontend/src/features/student-records/StudentProfilePage.tsx; features/emergency-response/IncidentReportPage.tsx, ParentNotificationPage.tsx, IncidentEntryPage.tsx; features/clinic-visits/ExcuseLetterPage.tsx, VisitDetailPage.tsx, NewVisitEntryPage.tsx, PeSportsReferralPage.tsx. Tests: features/print-documents.test.tsx, features/clinic-visits/VisitDetailPage.test.tsx. Knowledge base: ADR-040 (new), a note on ADR-028, Decisions-Summary, Module-Overview, the canonical Frontend Context Brief, Modules & Features and Project Plan, Skills-Setup, Changelog. Skills: cliniq-display-privacy, cliniq-print-patterns.
Changes Made: The full LRN replaces the masked one on the screens and printouts listed in ADR-040 item 1. The Incident Report's approval dialog now names the student ("for <name>, LRN <number>"), the same way the rest of that screen does. Pickers (including the picked chip), lists, the Dashboard, Reports, the duplicate warning, the Dispense message and the Audit Trail stay masked.
Skill changes (old → new):
- `cliniq-display-privacy`: the full LRN only on the Profile and the edit form → also on every single-student screen and its printout.
- `cliniq-print-patterns`: every printout masked → single-student printouts show the full LRN.
Reason: A screen or printout about one deliberately opened student already shows the full name, so hiding the LRN there protected nothing.
Testing Performed: Typecheck passes. Lint shows only the `NewVisitEntryPage` error that was already there. Ran the print, Visit Details, clinic-visits, emergency-response, student-records and component tests. The only failures are ones that were already failing before this change, plus the timing-flaky "saves Stage 1 with only the oximeter" test, which passed on the rerun. New assertions check for the full LRN and no mask on the Health Record, Incident Report and Excuse Letter printouts, and on Visit Details.
Known Issues: None new.
Next Steps: None.

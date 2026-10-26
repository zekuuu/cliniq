Date/Day/Time: Monday, October 26, 2026 — 14:43
Agent: Claude Code (Opus 5.5)
Task: Full LRN on the Monthly Report printouts
Status: Completed
Prompt/Request: "Report printing still has censored LRN"
Files Modified:
- frontend/src/features/reports/components/ReportsPrint.tsx
- frontend/src/features/reports/ReportsPage.test.tsx
- CLINIQ-Knowledge-Base/06-Decisions/ADR-044-Full-LRN-On-The-Dashboard-Printout.md, Decisions-Summary.md
- .claude/skills/cliniq-print-patterns/SKILL.md, .claude/skills/cliniq-display-privacy/SKILL.md
Changes Made:
- The incident table on the Monthly Report and Incident register printouts shows the full LRN (staff keep the Staff No.) instead of `maskPatientNumber`. The Incident register scope line no longer says "last four digits of the LRN only".
- ADR-044 amended: it had kept the Monthly Report masked on purpose; this request extends the full-LRN printout to it. The Reports screen stays masked, and the Audit Log printout is unchanged.
Reason: Zean expected the report printout to carry the full LRN, like the Dashboard printout.
Testing Performed: `tsc -b` clean; new test checks the Incident register screen stays masked and the printout (after `beforeprint`) contains the full LRN. Reports suite: 22/22 pass.
Known Issues: Canonical Modules & Features (cross-cutting display rule) needs the matching note, as ADR-044 already flagged.
Next Steps: None.

Date/Day/Time: Thursday, November 05, 2026 — 20:17 PHT
Agent: Claude Code (Opus 5.5)
Task: Tell users the Report an Issue dialog is for system problems only
Status: Completed
Prompt/Request: "then for report an issue, add a description there letting the user that the function is only for system related issues only not any administrative or whatever"
Files Modified:
- frontend/src/features/issue-reports/ReportIssueModal.tsx
Changes Made:
- Added a first paragraph to the dialog: "Use this only for problems with CLINIQ itself, such as an error, a page that won't load, or a button that doesn't work. For clinic, school, or account matters, contact the school administration instead."
Reason: Reports go to the system's developer (ISSUE_REPORT_RECIPIENT), not the school, so administrative requests sent there would be lost.
Testing Performed: ESLint clean; full `npx vitest run src` passed.
Known Issues: None.
Next Steps: None.

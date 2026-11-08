Date/Day/Time: Thursday, October 01, 2026 — 07:58 PHT
Agent: Codex
Task: Put the All option first and make it the default across CLINIQ filters, including date-range filters.
Status: Completed
Prompt/Request: “Then for all of the filtering like date range, move ‘All’ option at the very top and making it default”
Files Modified:
- frontend/src/components/ui/DateRangePicker.tsx
- frontend/src/components/ui/MultiSelect.tsx
- frontend/src/features/dashboard/DashboardPage.tsx
- frontend/src/features/dashboard/DashboardPage.test.tsx
- frontend/src/features/clinic-visits/VisitLogListPage.tsx
- frontend/src/features/clinic-visits/VisitLogListPage.test.tsx
- frontend/src/features/emergency-response/IncidentLogListPage.tsx
- frontend/src/features/audit-log/AuditLogPage.tsx
- frontend/src/features/student-records/IncompleteRecordsQueuePage.tsx
- frontend/src/features/student-records/IncompleteRecordsQueuePage.test.tsx
- frontend/src/components/ui/MultiSelect.test.tsx
- .claude/skills/cliniq-date-range-patterns/SKILL.md
- .claude/skills/cliniq-multi-select-patterns/SKILL.md
- CLINIQ-Knowledge-Base/04-Development/Skills-Setup.md
- CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md
Changes Made:
- Put All first in the shared DateRangePicker default order and all explicit operational date-range menus.
- Changed the dashboard's initial date range from Last 30 days to All.
- Changed the incomplete-records queue from Open to All by default and moved All to the first segmented option.
- Added an All checkbox as the first, selected-by-default option in MultiSelect; selecting it clears narrower choices.
- Updated tests and the matching bespoke skills/documentation.
Reason: Broad filters should show the complete available record set until the user intentionally narrows it, and the default choice should be visually and keyboard-first.
Testing Performed:
- npm.cmd run typecheck — passed (via the production build's TypeScript step).
- npm.cmd test -- --reporter=dot — 43 files, 199 tests passed.
- Dashboard and dashboard mock-db regression tests — 23 tests passed after bounding All-range trend buckets to recorded history.
- npm.cmd run lint — passed with one pre-existing Fast Refresh warning in `frontend/src/components/forms/FollowUpPrompt.tsx`.
- npm.cmd run build — passed.
- `git diff --check` — pending final check.
Known Issues: One pre-existing Fast Refresh lint warning remains in `FollowUpPrompt.tsx`, and existing non-blocking `act(...)` warnings remain in Follow-Up tests.
Next Steps: Run the final diff check and review the filter menus visually.

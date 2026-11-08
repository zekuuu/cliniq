Date/Day/Time: Thursday, October 01, 2026 — 08:06 PHT
Agent: Codex
Task: Make date/date-time sorting the default descending order in every sortable table that exposes a date column.
Status: Completed
Prompt/Request: “Also if there are date sorting in a table, make them the default sorted one I think it's descending the latest one shows at the top”
Files Modified:
- frontend/src/features/user-management/UserListPage.tsx
- frontend/src/features/inventory/InventoryListPage.tsx
- frontend/src/features/emergency-response/FollowUpListPage.tsx
- frontend/src/features/student-records/IncompleteRecordsQueuePage.tsx
- frontend/src/features/dashboard/components/VisitCalendar.tsx
- frontend/src/lib/tableSort.ts
- frontend/src/lib/tableSort.test.ts
- .claude/skills/cliniq-sorting-patterns/SKILL.md
- CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md
Changes Made:
- Set Last login, Expiration, Due date, Imported, Month, and Date table columns as their screens' active initial sort, all descending.
- Preserved the existing descending defaults for Visit Log, Incident Log, Audit Log, and Incident Archive.
- Kept missing values such as Never and No expiration below real dates in either direction.
- Updated the sorting skill to make newest-first date sorting the standing rule and added helper regression coverage.
Reason: Date-oriented tables should open with the newest available record visible first, matching the Visit Log workflow.
Testing Performed:
- npm.cmd run typecheck — passed.
- npm.cmd test -- --reporter=dot — 44 files, 200 tests passed.
- npm.cmd run lint — passed with one pre-existing Fast Refresh warning in `frontend/src/components/forms/FollowUpPrompt.tsx`.
- npm.cmd run build — passed.
- `git diff --check` — passed.
Known Issues: One pre-existing Fast Refresh lint warning remains in `FollowUpPrompt.tsx`, and existing non-blocking `act(...)` warnings remain in Follow-Up tests.
Next Steps: None.

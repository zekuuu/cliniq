Date/Day/Time: Tuesday, October 20, 2026 — 20:20 PHT
Agent: Codex (GPT-5)
Task: Remove redundant list-scope badges from page headers
Status: Completed
Prompt/Request: "remove all similar badges like this '**All visits**' on top of page, because it's already obvious it's the list of the page."
Files Modified:
- frontend/src/features/clinic-visits/VisitLogListPage.tsx
- frontend/src/features/emergency-response/IncidentLogListPage.tsx
- .claude/skills/cliniq-page-header-patterns/SKILL.md (new)
- CLINIQ-Knowledge-Base/04-Development/Skills-Setup.md
- CLINIQ-Knowledge-Base/08-Logs/Changelog.md
- CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-10-20-remove-redundant-list-header-badges.md (new)
Changes Made:
- Removed the passive `All visits` and date-range badge from the Visit Log header.
- Removed the matching `All incidents` and date-range badge from the Incident Log header.
- Kept both date-range controls, primary actions, and meaningful record-status badges unchanged.
- Added `cliniq-page-header-patterns`: old behavior allowed passive scope badges in list headers; new behavior reserves badges for meaningful states and leaves list scope in the filter control.
Reason:
- The page title already identifies the list, and the date-range filter already communicates the selected range. Repeating that context in a badge adds visual noise without helping the user act.
Testing Performed:
- `npm.cmd test -- VisitLogListPage IncidentLogListPage` — 2 files / 20 tests passed.
- `npm.cmd run typecheck` — passed.
- Focused ESLint on the two pages and their tests — passed.
- `git diff --check` — passed (no whitespace errors).
Known Issues:
- None found. The untouched `All visits` text in the Excuse Letter filter remains a functional filter choice, not a page-header badge.
Next Steps:
- None for this request.

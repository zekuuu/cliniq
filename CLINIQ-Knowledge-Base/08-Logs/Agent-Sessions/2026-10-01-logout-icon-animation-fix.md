Date/Day/Time: Thursday, October 01, 2026 — 22:33:50 PHT
Agent: Codex
Task: Fix the logout icon animation when clicked.
Status: Completed
Prompt/Request: “Fix the logout icon animation when clicked, why is it spinning it isn't a loading”
Files Modified:
- frontend/src/layouts/AppShell.tsx
- frontend/src/features/qr-digital-health-id/mobile/QrMobileHubPage.tsx
- frontend/src/layouts/AppShell.test.tsx
- CLINIQ-Knowledge-Base/08-Logs/Frontend-Issues-and-TODOs.md
- CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md
Changes Made:
- Removed the `animate-spin` class from the desktop shell and shell-free mobile logout icons.
- Kept the pending logout guard, disabled state, and “Logging out” accessible label so duplicate clicks remain blocked and the audit/session flow is unchanged.
- Added a regression assertion that the shell logout icon does not spin while logout is pending.
Reason: Logout is a short session-ending action, not a progress task; rotating the familiar logout glyph made it look like a loading indicator.
Testing Performed:
- `npm.cmd test -- src/layouts/AppShell.test.tsx --reporter=dot` — passed (9 tests).
- `npm.cmd test -- src/features/qr-digital-health-id/mobile/QrMobileHubPage.test.tsx --reporter=dot` — passed (2 tests).
- `npm.cmd run typecheck` — passed.
- `npm.cmd run build` — passed.
- `npm.cmd run lint` — blocked by a pre-existing `react-hooks/set-state-in-effect` error in `frontend/src/features/issue-reports/ReportIssueModal.tsx`; one pre-existing Fast Refresh warning also remains.
Known Issues: Full lint remains red for the unrelated ReportIssueModal effect rule.
Next Steps: None for this logout animation fix; address the existing lint error separately if required.

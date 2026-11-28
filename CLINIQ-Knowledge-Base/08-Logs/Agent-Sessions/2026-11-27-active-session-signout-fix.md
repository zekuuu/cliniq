Date/Day/Time: Friday, November 27, 2026 — 13:13 PHT
Agent: Codex
Task: Investigate unexpected sign-out during active use.
Status: Completed
Prompt/Request: The system automatically signs out even when the user is active; identify and solve the problem shown by the "Your session has ended" sign-in screen.
Files Modified: frontend/src/hooks/useIdleSignOut.ts; frontend/src/hooks/useIdleSignOut.test.tsx; frontend/src/hooks/README.md; backend/storage/load/vhost-8081.conf (local ignored file); Frontend-Changelog.md; this session log.
Changes Made: Reset the browser idle clock on each person activity in API mode before attempting keep-alive. Added a regression test for a failed keep-alive during continued keyboard use. Set a separate session cookie name for the local load-test virtual host.
Reason: Previously, API-mode activity did not update the local clock unless the keep-alive succeeded. Also, localhost cookies are shared across ports, so the test host could overwrite the normal clinic login cookie.
Testing Performed: Focused Vitest test passed; frontend TypeScript typecheck passed; git diff whitespace check passed.
Known Issues: The load-test vhost file is Git-ignored; an Apache vhost already installed outside the repository must receive the same SESSION_COOKIE setting and Apache must restart. The screenshot alone does not reveal which 401 code triggered the reported incident.
Next Steps: If sign-out recurs, capture the failing API response code and whether the load-test host was open; verify the installed vhost has the distinct cookie setting.

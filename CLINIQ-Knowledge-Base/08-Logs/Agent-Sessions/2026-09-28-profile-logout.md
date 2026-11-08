Date/Day/Time: Monday, September 28, 2026 — 22:07
Agent: Codex
Task: Add a logout action to the signed-in user area of the application shell.
Status: Completed
Prompt/Request: "In user profile, isn't there should be a logout button"
Files Modified:
- frontend/src/App.tsx
- frontend/src/components/icons/Icon.tsx
- frontend/src/layouts/AppShell.tsx
- frontend/src/layouts/AppShell.test.tsx
- frontend/src/lib/mock-db/api.ts
- frontend/src/lib/mock-db/session.ts
- frontend/src/routes/AppRoutes.tsx
- frontend/src/routes/AppRoutes.test.tsx
- CLINIQ-Knowledge-Base/03-Design/Screen-Inventory.md
- CLINIQ-Knowledge-Base/09-References/Canonical-Documents/CLINIQ_Frontend_Context_Brief.md
- CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md
- CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-09-28-profile-logout.md
Changes Made: Added a visible, labelled Log out button beside the signed-in user's name and role. In the frontend-only mock, clicking it appends the required logout audit entry, clears the mock role selection, and shows a signed-out state. The real Sanctum logout endpoint will replace the mock data-layer action when authentication is built.
Reason: Manual logout is a stated session safeguard and a named audit-trail requirement, especially important because the shared clinic workstation has no idle timeout.
Testing Performed: `npm.cmd test` (137 passed); `npm.cmd run typecheck` (passed); `npm.cmd run lint` (passed with one pre-existing Fast Refresh warning in FollowUpPrompt.tsx); `npm.cmd run build` (passed).
Known Issues: The Login and real Sanctum authentication screens are not built yet, so the signed-out state intentionally does not provide a sign-in form.
Next Steps: Replace `logoutMockSession` with the Sanctum logout request and route the user to Login when Phase B2 authentication is implemented.

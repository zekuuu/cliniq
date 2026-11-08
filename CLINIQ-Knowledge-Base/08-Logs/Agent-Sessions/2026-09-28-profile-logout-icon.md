Date/Day/Time: Monday, September 28, 2026 — 22:11
Agent: Codex
Task: Refine the App Shell logout control's visual treatment.
Status: Completed
Prompt/Request: "make it only red icon close to the name"
Files Modified:
- frontend/src/layouts/AppShell.tsx
- frontend/src/layouts/AppShell.test.tsx
- CLINIQ-Knowledge-Base/03-Design/Screen-Inventory.md
- CLINIQ-Knowledge-Base/09-References/Canonical-Documents/CLINIQ_Frontend_Context_Brief.md
- CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md
- CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-09-28-profile-logout-icon.md
Changes Made: Replaced the visible logout label with a compact red logout icon directly after the user's name and role. The icon remains a native button with an accessible name, tooltip, focus ring, hover treatment, disabled state, and unchanged audited logout behavior.
Reason: Match the requested lighter-weight header treatment without losing discoverability for assistive technology or keyboard users.
Testing Performed: `npm.cmd test -- AppShell.test.tsx` (5 passed); `npm.cmd run typecheck` (passed).
Known Issues: None for this visual refinement. Login and real Sanctum authentication remain future work.
Next Steps: Replace the mock logout function with the Sanctum endpoint when Phase B2 authentication is implemented.

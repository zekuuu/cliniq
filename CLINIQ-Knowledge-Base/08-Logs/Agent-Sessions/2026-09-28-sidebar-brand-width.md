Date/Day/Time: Monday, September 28, 2026 — 22:00
Agent: Codex
Task: Widen the expanded sidebar so the academy label in its brand lockup does not wrap.
Status: Completed
Prompt/Request: "adjust the width of the sidebar a bit, because it wrapped academy" Follow-up: "a bit more"
Files Modified: `frontend/src/layouts/AppShell.tsx`, this session log, and `Frontend-Changelog.md`.
Changes Made: Increased the expanded desktop sidebar from 14rem to 16rem. The collapsed 4.75rem sidebar width is unchanged.
Reason: Keep “Mendez Christian Academy” on one line below CLINIQ while preserving the compact collapsed state.
Testing Performed: Focused AppShell Vitest suite passed (3 tests); `npm.cmd run typecheck` passed; `git diff --check` passed.
Known Issues: None.
Next Steps: None.

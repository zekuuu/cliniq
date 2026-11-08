# Explicit No-Edge Testing Rule

Date/Day/Time: Thursday, October 01, 2026 — 15:32 PHT
Agent: Codex
Task: Add an explicit repository instruction prohibiting Microsoft Edge for testing.
Status: Completed
Prompt/Request: “Can you explicitly tell not to use edge browser to test”
Files Modified:
- `AGENTS.md`
- `CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md`
- `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-10-01-no-edge-testing.md`
Changes Made:
- Added a repository-wide rule prohibiting Edge, Edge CDP, headless Edge, and Edge browser-profile or screenshot artifacts for testing and verification.
- Directed agents to prefer deterministic tests and source-level checks; when a live browser check is explicitly necessary, use Playwright/Chromium and keep temporary artifacts outside the repository.
Reason: Edge-based verification was taking too long and creating unnecessary files.
Testing Performed: Read-only review of the resulting documentation changes; no browser was launched.
Known Issues: None introduced.
Next Steps: Future agents should follow the new rule.

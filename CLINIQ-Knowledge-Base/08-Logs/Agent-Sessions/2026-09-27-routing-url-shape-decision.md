Date/Day/Time: Sunday, September 27, 2026 — 09:50
Agent: Claude Code (Opus 5.5)
Task: Resolve the URL-shape half of the routing blocking decision; leave the library choice open as a proposal
Status: Completed
Prompt/Request: Edit Development-Phases.md §0 "Routing library" bullet. Confirm path-based routes (/{screen}, e.g. /students, /qr/scan) over query-param routes (?screen=X), with reasoning: 1:1 mapping onto ADR-008's feature folders; per-screen code-splitting for the 4GB RAM Performance NFR; declarative, auditable role-based route guards; natural nested/dynamic segments (/students/2026-00001/history). Note query params still belong for in-screen filters/view-state (/visits?dateRange=last30days) — path = which screen, query = what state. Leave the library choice open: propose React Router, marked explicitly as proposed, not confirmed. Update AGENTS.md/CLAUDE.md if either references this blocker as fully unresolved.
Files Modified:
- CLINIQ-Knowledge-Base/04-Development/Development-Phases.md (§0 intro status line; Routing library bullet)
- CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md
Changes Made:
- Split the Routing library bullet into two halves: URL shape (CONFIRMED: path-based, with the four requested reasons plus the path-vs-query rule) and library (PROPOSED, NOT CONFIRMED: React Router, still blocking until the owner confirms).
- Noted that the existing `?screen=X` / `&role=` preview switch in `App.tsx` is temporary scaffolding to migrate to paths, not the target design.
- Added a dated status line to the §0 intro so it no longer claims neither decision has progressed.
- AGENTS.md / CLAUDE.md: checked, and neither references the routing blocker, so neither was changed.
Reason: Owner confirmed the URL shape; library choice deliberately left for a separate confirmation.
Testing Performed: None needed (documentation only).
Known Issues:
- `Frontend-Loop-Engineering.md`'s "Two blocking decisions resolved" checkbox stays unchecked, because the library and data-fetching halves are still open.
- No ADR was added yet. Once the library is confirmed, one ADR could record both halves together.
- Older session logs and code comments (`App.tsx`, `AppShell.tsx`, `latency.ts`) still say "routing is an open decision". Logs are historical and stay as written. The code comments are still accurate about the library, so they can be updated when the router is wired.
Next Steps: Owner confirms or rejects React Router. Then install it, replace the `?screen=` switch with lazy-loaded path routes and role guards, and add the ADR.

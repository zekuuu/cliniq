Date/Day/Time: Wednesday, September 30, 2026 — 15:05
Agent: Codex
Task: Consolidate the frontend's URL/query parameters into one reviewable Markdown file.
Status: Completed
Prompt/Request: “what about others? like ?screen please get all then put them in one md file so I can easily recheck them”
Files Modified:
- `URL-Parameters.md`
- `README.md`
- `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-09-30-url-parameters-reference.md`
- `CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md`
Changes Made:
- Searched the current frontend source, route builders, tests, decision records, and historical session logs for query-string usage.
- Documented all 10 active query keys: `mock`, `mockEmpty`, `mockLatency`, `mockPersist`, `mockReset`, `role`, `student`, `item`, `user`, and `focus`.
- Documented retired `?screen` and `?mode=edit` parameters, plus the not-yet-implemented `dateRange` example.
- Added examples, accepted values, behavior notes, and source-file pointers.
- Linked the new reference from the root README.
Reason: The existing mock-db README documented only mock switches, while route and workflow parameters were spread across source files and historical logs.
Testing Performed: Read-only source inventory with ripgrep; confirmed each active parameter against its current source reader or route builder. No application code was changed.
Known Issues: Query parameters are not automatically preserved across every in-app navigation; this is documented in `URL-Parameters.md`.
Next Steps: Keep `URL-Parameters.md` updated when adding, renaming, retiring, or changing a query parameter.

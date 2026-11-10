# 2026-11-10 — Docs sync follow-up: the items left not done

Date/Day/Time: Tuesday, November 10, 2026 — 18:38 PHT
Agent: Claude Opus 5.5 (Claude Code).
Branch: `main` at `8f70297`, uncommitted (Zean commits with `/komit`; nothing committed to `backend`).
Task: finish what the documentation sync left open.
Status: Partial (two items need Zean)

Prompt/Request: Zean, Tuesday, November 10, 2026 (chat): "finish those not done"; then "edit them also in main since they're not really backend works" (for the backend README and logs).

Files Modified:
- `backend/README.md`, `08-Logs/Backend-Issues-and-TODOs.md`, `08-Logs/Backend-Changelog.md`: see [2026-11-10-backend-docs-sync-readme](2026-11-10-backend-docs-sync-readme.md). Edited on `main`; a temporary `backend` worktree used for the draft was removed, and `backend` is unchanged at `b51166a`.
- `frontend/src/lib/mock-db/mock-db.json` and the tests that named the demo accounts: "Jennesse Baas" became "Demo Clinician", "Gilan Avelida" became "Demo Admin" (an alphabetical order the tests expect is kept), "Jennesse B. Ocampo" (a typed rename in a test) became "Demo B. Clinician"; two search terms in tests followed (`'jenn'` to `'clin'`, `'gilan'` to `'demo admin'`). The client contact named in the planning documents is unchanged.
- `frontend/package.json`: `dev` binds Vite to `localhost` instead of `0.0.0.0` (added September 28, 2026 with no recorded reason), so the dev server is no longer reachable from the developer's network, in the spirit of ADR-079. Checked: the server answers at `http://localhost:5174` and prints no Network address.
- Prettier (`npx prettier --write .` in `frontend/`): 326 files reformatted, formatting only.
- `08-Logs/Frontend-Issues-and-TODOs.md`, `Issues-Done-Archive.md`: the demo-names FIX resolved and moved; counts recounted.

Testing Performed: `npx vitest run`: 1185 passed of 1185. `npm run lint`: 0 errors, 1 warning (unchanged). `npm run build`: built. `npx prettier --check .`: 29 files still differ (below).

Known Issues (need Zean):
- **29 test files are not formatted.** Overwriting files this session had already changed with `sed` failed in the sandbox ("UNKNOWN: unknown error, open"), and replacing them by delete-and-move was refused by the permission check. Run `cd frontend && npm run format` once; formatting only.
- **Migrations and the 260 constraint tests were not run.** MariaDB's root has a password and the agent cannot read `backend/.env`. Steps: the overnight morning report, "ONLY YOU CAN DO" 3 to 6, on the `backend` branch.

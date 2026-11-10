# 2026-11-10 — Backend docs sync: backend README and a stale DECIDE

Date/Day/Time: Tuesday, November 10, 2026 — 18:30 PHT
Agent: Claude Opus 5.5 (Claude Code), docs-only.
Branch: `main` at `8f70297`, uncommitted (Zean: "edit them also in main since they're not really backend works"; first drafted in a temporary `backend` worktree, then copied here and the worktree removed; nothing was committed to `backend`). The README describes the `backend` branch at `b51166a`.
Task: the backend-owned part of the pre-SRS documentation sync, which could not go on `main` (ADR-056).
Status: Completed

Prompt/Request: Zean, Tuesday, November 10, 2026 (chat): "finish those not done", after the docs sync on `main` left the `backend` branch's README and its stale ERD DECIDE untouched.

Files Modified:
- `backend/README.md`: last-checked line; current state (B0 foundation, 85 Pest tests; 48 B1 migrations written, not yet run on MariaDB; 3 routes); new "Install, configure and migrate" section (pointing to Environment Setup for the database accounts; no secrets); settings from `config/cliniq.php`; structure with the migration folders; production notes for the clinic PC only (ADR-079), replacing the LAN address and HTTPS wording.
- `08-Logs/Backend-Issues-and-TODOs.md`: the DECIDE "Database-design draft … not final or approved" resolved (ADR-057 approved it; B1 built the migrations) and moved to Done; counts recounted.
- `08-Logs/Backend-Changelog.md`: one row.

Testing Performed: `composer check` passed on this commit earlier the same day (85 tests); the README's commands were run then. `php artisan migrate` was not run (no database password available to the agent).

Known Issues: running the migrations and the 260 constraint tests still needs the MariaDB password (see the overnight morning report, "ONLY YOU CAN DO").

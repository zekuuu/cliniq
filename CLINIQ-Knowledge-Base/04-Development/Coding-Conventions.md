# Coding Conventions

- **Modular code organization** (backend and frontend both) — one folder per module, mirroring each other directly. Frontend: `frontend/src/features/<module>/` (`06-Decisions/ADR-008-Frontend-Folder-Structure.md`). Backend: `backend/app/Modules/<Module>/`, with a plain PSR-4 namespace mapping in `composer.json` — no `nwidart/laravel-modules` or similar package (`06-Decisions/ADR-009-Modular-Backend-Architecture.md`). Genuinely cross-cutting code (the audit trail, base classes) goes in `app/Shared/`, never duplicated per module and never owned by whichever module happened to need it first. Don't reach into another module's folder to reuse its logic directly — if two modules need to share something, it belongs in `Shared/`.
- **Formatting:** `frontend/` uses ESLint and Prettier (`npm run lint`, `npm run format`, `.prettierrc.json`). A tool for the backend is chosen with the backend foundation (ADR-056).
- **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`).
- **Branching:** trunk-based — `main` + short-lived `feature/<name>` branches. Backend work is the exception: it stays on one `backend` branch (ADR-056).
- **PRs, even for agent work:** yes, even if self-merged — gives a reviewable diff and a natural place to link the matching `08-Logs/Agent-Sessions/` entry.
- **Avoiding agent collisions:** pull latest before starting, never work directly on `main`, check `06-Decisions/` and `08-Logs/` before starting, never force-push over another branch.

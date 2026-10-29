# frontend

Last checked against the code on Thursday, October 29, 2026 (commit dde64408).

## Purpose

The CLINIQ browser app: React + TypeScript, built with Vite and styled with Tailwind CSS (ADR-007).

## Current state

**Built (on sample data).** Every screen runs on the shared mock-data layer in `src/lib/mock-db/`. The backend is not built, so there is no API client and no Sanctum sign-in yet. The screens, and the features decided but not built yet, are listed in the root [README.md](../README.md#current-state).

## How to run

From this folder:

```bash
npm ci
npm run dev        # http://localhost:5173
npm test           # Vitest + React Testing Library
npm run build      # type-check and production build
```

Node.js 22.22.2 or a later 22.x, 24.15 or a later 24.x, or 26 or later. First-time Windows setup: [../setup-step.md](../setup-step.md). Sign-in accounts: [src/lib/mock-db/README.md](./src/lib/mock-db/README.md). Preview switches: [../URL-Parameters.md](../URL-Parameters.md).

## Structure

Feature-based structure under `src/features/`; see `CLINIQ-Knowledge-Base/06-Decisions/ADR-008-Frontend-Folder-Structure.md` for the reasoning. Each feature folder (`src/features/<module>/`) has its own `README.md`. Shared code lives in `src/components/`, `src/hooks/`, `src/layouts/`, `src/lib/`, `src/routes/` and `src/types/`, each with a README.

Login is a standalone auth composition: a full-height white left panel (HealWare/CLINIQ lockup, Sign In form, school name) beside the blurred school photo; it deliberately has no application footer. The shared copyright/footer remains on signed-in shell pages only.

## Links

- Build process an agent follows when adding screens: `CLINIQ-Knowledge-Base/04-Development/Frontend-Loop-Engineering.md`
- Design rules: `CLINIQ-Knowledge-Base/03-Design/Design-System.md`

## If you are copying a zip export

If this folder looks like an empty or skeleton structure (just folders and README stub files, no real components), you are looking at an old chat-generated zip export, made before any real frontend code existed. If you're copying a zip export into your actual project folder, never let this folder overwrite a `frontend/` that already has real, built code in it — that would destroy working code. See `AGENTS.md`, "Before you start any task," Step 0a, for the full rule.

# frontend

Last checked for ADR-095 frontend-only scope on Thursday, November 26, 2026 — 20:08 PHT; earlier full sync checked against the code on Monday, November 23, 2026 — 18:07 PHT for the docs-only sync of `main` at `0a178b0` (9 documentation commits committed; no product behavior, ADR, route, or number changes); on Sunday, November 22, 2026 — 00:52 PHT for the docs sync of `main` at `b9fd646` (ADR-084, the realistic five-year demo school to February 28, 2027); on Friday, November 20, 2026 — 01:54 PHT for the docs sync of `main` at `533df61` (ADR-082, ADR-083, the emergency-contact check, the demo seeder) and the Overview's frequent-visitor pager; on Thursday, November 19, 2026 for the paged lists and the speed run only (ADR-082); on Wednesday, November 18, 2026 for where the code lives only (the merge into `main`, ADR-081); on Tuesday, November 17, 2026 for the changes of the follow-ups and load run (`feat/connect-frontend` at `759781e`, committed Tuesday, November 17, 2026 — 05:27 PHT; see `08-Logs/Load-Test-Nov16/NOTES.md`); otherwise as on Sunday, November 15, 2026 (the `backend` branch at `397e000`; `frontend/` unchanged since `6a94e3f`).

## Purpose

The CLINIQ browser app: React + TypeScript, built with Vite and styled with Tailwind CSS (ADR-007).

## Current state

**Built; runs on sample data or on the real API (ADR-080).** Every screen still runs on the shared mock-data layer in `src/lib/mock-db/` by default, and that layer is kept. Since Sunday, November 15, 2026 (built on `feat/connect-frontend`, on `main` since Wednesday, November 18, 2026, ADR-081) each module can run on the Laravel API instead, behind a switch: screens import `src/lib/data`, which sends each call to the mock or to its HTTP twin in `src/lib/api/http/`. Since Thursday, November 19, 2026 (ADR-082) the long lists (Visit Log, Incident Log, Follow-Ups, Student List, Incomplete Records, Audit Log, Inventory Usage History) ask the server for one page at a time through `src/hooks/usePagedList.ts` and TanStack Query (`src/lib/queryClient.ts`); in mock mode the same hook pages the mock's list in memory. Since Thursday, November 19, 2026 (ADR-083) every action's result is a bottom-right toast from **Sonner** (`sonner`): components import `notify` from `src/lib/notify.ts`, never `sonner` (an ESLint rule enforces it), and a successful form resets and goes back to the top (`src/lib/scrollToTop.ts`; skill `cliniq-toast-patterns`). Run the tests from `D:` with a capital D (see [../COMMANDS.md](../COMMANDS.md)). The screens, and the features decided but not built yet, are listed in the root [README.md](../README.md#current-state).

## How to run

From this folder:

```bash
npm ci
npm run dev        # http://localhost:5173
npm test           # Vitest + React Testing Library
npm run build      # type-check and production build
```

### Run on the real API (ADR-080)

1. Start the API from `backend/` (development database `cliniq`, seeded with the development seeder): `php artisan serve` (port 8000). Its `.env` needs `CORS_ALLOWED_ORIGINS=http://localhost:5173` and `SANCTUM_STATEFUL_DOMAINS=localhost:5173`.
2. Set the mode, then start this server with `npm run dev`. Three ways, the first one wins:
   - **Everything on the API:** `VITE_API_MODE=api` (or `mock` to force the mock everywhere).
   - **Module by module:** leave `VITE_API_MODE` empty and set `VITE_API_MODE_<MODULE>=api` for `AUTH`, `STUDENTS`, `STAFF_PATIENTS`, `SCHOOL_YEARS`, `VISITS`, `INCIDENTS`, `INVENTORY`, `DASHBOARD`, `REPORTS`, `USERS`, `BACKUP`, `AUDIT`, `SETTINGS`, `ISSUE_REPORTS`, `REFERENCE`. A module on the API needs its dependencies on the API too (every module needs `AUTH`); a red development banner names a missing one.
   - **Nothing set:** every module on the mock, as before.
3. Put the values in `frontend/.env.local` (or the shell), with `VITE_API_URL=http://localhost:8000/api` for the two development servers.

A development-only line at the bottom right shows each module's mode, and the console prints a table at start-up. Tests always run on the mock. A production build (`npm run build`) served beside the API on the clinic PC needs no setting: the API is at the relative `/api` (ADR-079); build it with `VITE_API_MODE=api`.

Node.js 22.22.2 or a later 22.x, 24.15 or a later 24.x, or 26 or later. First-time Windows setup: [../setup-step.md](../setup-step.md). Sign-in accounts: [src/lib/mock-db/README.md](./src/lib/mock-db/README.md). Preview switches: [../URL-Parameters.md](../URL-Parameters.md).

## Structure

Feature-based structure under `src/features/`; see `CLINIQ-Knowledge-Base/06-Decisions/ADR-008-Frontend-Folder-Structure.md` for the reasoning. Each feature folder (`src/features/<module>/`) has its own `README.md`. Shared code lives in `src/components/`, `src/hooks/`, `src/layouts/`, `src/lib/`, `src/routes/` and `src/types/`, each with a README.

Login is a standalone auth composition: a full-height white left panel (HealWare/CLINIQ lockup, Sign In form, school name) beside the blurred school photo; it deliberately has no application footer. The shared copyright/footer remains on signed-in shell pages only.

## Links

- Build process an agent follows when adding screens: `CLINIQ-Knowledge-Base/04-Development/Frontend-Loop-Engineering.md`
- Design rules: `CLINIQ-Knowledge-Base/03-Design/Design-System.md`

## If you are copying a zip export

If this folder looks like an empty or skeleton structure (just folders and README stub files, no real components), you are looking at an old chat-generated zip export, made before any real frontend code existed. If you're copying a zip export into your actual project folder, never let this folder overwrite a `frontend/` that already has real, built code in it — that would destroy working code. See `AGENTS.md`, "Before you start any task," Step 0a, for the full rule.

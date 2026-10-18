# frontend

> ⚠️ **If this folder looks like an empty/skeleton structure (just folders and README stub files, no real components), that's expected — this is what a chat-generated zip export produces before any real frontend code exists.** If you're copying a zip export into your actual project folder, never let this folder overwrite a `frontend/` that already has real, built code in it (e.g., after the Dashboard or any other screen has actually been built) — that would destroy working code. See `AGENTS.md`, "Before you start any task," Step 0a, for the full rule.

**Current state:** the app is built and runs on the shared mock-data layer (`src/lib/mock-db/`); there is no backend yet. From this folder: `npm ci`, then `npm run dev` (http://localhost:5173), `npm test`, `npm run build`. First-time Windows setup: `../setup-step.md`. Sign-in accounts: `src/lib/mock-db/README.md`.

Login is a standalone auth composition: a full-height white left panel (HealWare/CLINIQ lockup, Sign In form, school name) beside the blurred school photo; it deliberately has no application footer. The shared copyright/footer remains on signed-in shell pages only.

React + TypeScript + Vite frontend. Feature-based structure under `src/features/` — see `CLINIQ-Knowledge-Base/06-Decisions/ADR-008-Frontend-Folder-Structure.md` for the full reasoning, and `CLINIQ-Knowledge-Base/04-Development/Frontend-Loop-Engineering.md` for the actual build process an agent follows when adding real screens here.

Each feature folder (`src/features/<module>/`) has its own `README.md` explaining what belongs there — start with `src/features/qr-digital-health-id/README.md` for the most structurally distinct example (its printing/scanning/shared split).

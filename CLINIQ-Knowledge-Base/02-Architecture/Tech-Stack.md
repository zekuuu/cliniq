# Tech Stack

All items below are **confirmed**, as of September 25, 2026 — the previously "proposed, pending confirmation" items were resolved after actually researching current maintenance status and compatibility, not just picking the first plausible-looking option. Full reasoning: `06-Decisions/ADR-007-Stack-Finalization.md`.

| Layer | Technology | Note |
|---|---|---|
| Frontend | React + TypeScript | |
| Build tool | **Vite** | Confirmed as the 2026 default for new React SPAs — Create React App is deprecated, Vite is the "safest choice for most teams" |
| Styling | Tailwind CSS | |
| Routing | **React Router** (v7) | Path-based routes (`/{screen}`), one central route table (`routes/AppRoutes.tsx`) with role guards and lazy-loaded screens — see `ADR-012` |
| Data fetching | Plain promise-based `useAsyncData` hook, feature-local `api/` modules | For the frontend-first and initial API-integration phases — see `ADR-013` |
| Backend | Laravel (PHP) | |
| Auth | **Laravel Sanctum** | SPA cookie mode (ADR-056), built specifically for a React+Laravel pairing — not plain "Laravel Authentication," which assumes Blade views |
| Database | **MariaDB (XAMPP), MySQL-compatible** | The database XAMPP installs; Laravel reaches it through its MySQL driver |
| Local dev | **XAMPP**, standardized across all machines | Matches the client's production environment exactly; deliberately not mixing in Laravel Herd |
| Dashboard charts | **Chart.js** (via `react-chartjs-2`) | Chosen over Recharts specifically for smaller bundle size and Canvas rendering — both matter more here than Recharts' nicer JSX composability, given the 4GB RAM target and the Dashboard's fairly simple chart needs (trend lines, a calendar heatmap, nothing exotic) |
| Testing | Pest (backend), Vitest + React Testing Library (frontend) | |
| Deployment (current) | Hosted on the clinic's existing computer and used only there (`http://localhost`); no LAN access, no internet-facing hosting | ADR-029, ADR-079 |
| Deployment (future) | Remote Server / Cloud | Documented future phase, not current work |

Updated Tuesday, November 10, 2026 — 17:27 PHT for the code at `b51166a`: both sides' tools are installed and in use. The frontend runs on sample data (`frontend/package.json`); the backend foundation runs its Pest, Pint and Larastan checks (`composer check`), with Laravel 13.39 and Sanctum 4.3 (`backend/composer.lock`). Installed versions: [Facts sheet](../00-Project-Core/Facts-Sheet.md#stack-installed-versions). Setup: `04-Development/Environment-Setup.md`.

# Environment Setup

**The frontend steps are done. The backend steps are not yet executed: confirmed plan, run on the `backend` branch (ADR-056).**

| Step | Command (illustrative) | Purpose | State |
|---|---|---|---|
| Laravel init | `composer create-project laravel/laravel backend` | Scaffolds the backend | Not run |
| React init | `npm create vite@latest frontend -- --template react-ts` | Scaffolds frontend with TypeScript, via Vite | Done |
| Tailwind | `npm install tailwindcss` + config | Styling | Done |
| Sanctum | `composer require laravel/sanctum` | SPA authentication | Not run |
| Charts | `npm install chart.js react-chartjs-2` | Dashboard charts | Done |
| MariaDB | Configure Laravel `.env` against XAMPP's MariaDB (`DB_CONNECTION=mysql`, the MySQL driver) | Database connection | Not run |
| Git | `git init` at the repo root | Version control from day one | Done |

Standardize all dev machines on **XAMPP**, not Laravel Herd — matches the client's production environment exactly. Check the target XAMPP install's bundled PHP version before picking a Laravel version (Laravel 11+ needs PHP 8.2+). Node.js must be 22.22.2 or a later 22.x, 24.15 or a later 24.x, or 26 or later (`setup-step.md`).

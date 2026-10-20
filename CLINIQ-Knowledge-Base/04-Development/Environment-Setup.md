# Environment Setup

**Not yet executed — confirmed plan, pending your go-ahead to actually run it.**

| Step | Command (illustrative) | Purpose |
|---|---|---|
| Laravel init | `composer create-project laravel/laravel backend` | Scaffolds the backend |
| React init | `npm create vite@latest frontend -- --template react-ts` | Scaffolds frontend with TypeScript, via Vite |
| Tailwind | `npm install tailwindcss` + config | Styling |
| Sanctum | `composer require laravel/sanctum` | SPA authentication |
| Charts | `npm install chart.js react-chartjs-2` | Dashboard charts |
| MySQL | Configure Laravel `.env` against XAMPP's MySQL | Database connection |
| Git | `git init` at the repo root | Version control from day one |

Standardize all dev machines on **XAMPP**, not Laravel Herd — matches the client's production environment exactly. Check the target XAMPP install's bundled PHP version before picking a Laravel version (Laravel 11+ needs PHP 8.2+). Pin a Node LTS version across all machines/agents.

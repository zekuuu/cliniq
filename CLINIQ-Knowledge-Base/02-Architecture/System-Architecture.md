# System Architecture

**Shape:** three-tier — React+TypeScript SPA (Tailwind-styled) → Laravel REST API (business logic, auth via Sanctum) → MySQL.

**Frontend/backend communication:** in development, Vite's dev server runs separately and proxies API calls to Laravel (standard pattern, avoids CORS friction). In production, the *built* React assets are copied into Laravel's public folder and Laravel/Apache serves everything from one origin — this is what "build once, Apache serves it" (Project Plan, Section 6.2/6.3) actually means mechanically.

**LAN → Cloud path:** because the frontend only ever talks to the backend through an API, moving the backend to a remote/cloud host later is a deployment change (new URL, new server config), not an architecture change. Nothing about the current design needs a rewrite to support this.

**Repository shape:** monorepo, confirmed and built. One Git repo, root pushed to GitHub:

```
CLINIQ/
├── AGENTS.md                  ← entry point for any AI agent
├── CLAUDE.md                  ← pointer to AGENTS.md
├── README.md
├── frontend/                  ← React + TypeScript + Vite, feature-based structure (see ADR-008)
│   └── src/features/          ← one folder per module
├── backend/                   ← Laravel API, module-based structure (see ADR-009)
│   └── app/Modules/           ← one folder per module, mirroring the frontend directly; Shared/ holds genuinely cross-cutting code (audit trail, base classes)
└── CLINIQ-Knowledge-Base/     ← this vault
```

**Modularity is a stated architectural principle on both sides of the stack, not just an implementation detail** (`01-Requirements/Non-Functional-Requirements.md` — Modularity & Scalability): frontend and backend both organize code by module, in parallel folder shapes, so a module can be developed, tested, reviewed, or handed off in isolation. Full reasoning for the frontend structure: `06-Decisions/ADR-008-Frontend-Folder-Structure.md`. Full reasoning for the backend structure, including why a dedicated package (`nwidart/laravel-modules`) was considered and not chosen: `06-Decisions/ADR-009-Modular-Backend-Architecture.md`.

**Development methodology:** see `Development-Methodology.md` for the iterative + interface-construction (frontend-first) approach.

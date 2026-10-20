# ADR-012: Frontend Routing — Path-Based URLs with React Router

**Date:** Sunday, September 27, 2026 — 10:01
**Status:** Accepted
**Note (Wednesday, October 21, 2026 — 01:09):** the QR feature this ADR mentions was removed (ADR-027, [2026-10-21-remove-qr-feature](../08-Logs/Agent-Sessions/2026-10-21-remove-qr-feature.md)); the rest of the decision stands.
**Note (Wednesday, October 21, 2026 — 01:47):** the PE/Sports Instructor role, the phone-only screens and the `?student=` parameter this ADR may mention were removed (ADR-029, ADR-033, [2026-10-21-remove-phone-screens-and-instructor](../08-Logs/Agent-Sessions/2026-10-21-remove-phone-screens-and-instructor.md)); the rest of the decision stands.
**Note (Wednesday, October 21, 2026 — 07:00):** the CLINIQ Student Number this ADR mentions was replaced by the LRN (ADR-028, [2026-10-21-lrn-replaces-student-number](../08-Logs/Agent-Sessions/2026-10-21-lrn-replaces-student-number.md)); lists show it masked. The rest of the decision stands.

## Context
`Development-Phases.md` §0 flagged the routing library as a blocking decision that no canonical document had made. In the meantime, Phase F1/F2 screens were built behind a temporary `?screen=X` switch in `App.tsx`, the sidebar pointed at `#main-content`, and every screen shipped in one bundle (the build warned it exceeded 500 kB). The owner first confirmed the URL shape (Sunday, September 27, 2026 — 09:50), then approved React Router and asked for it to be wired into every built screen.

## Decision
- **URL shape: path-based routes** (`/{screen}`, e.g. `/students`, `/qr/scan`, `/students/2026-00001`), not query-param routes. **Path = which screen, query = what state that screen is in** (`/visits?dateRange=last30days`, `/visits/new?student=2026-00001`).
- **Library: React Router** (`react-router` v7), declarative `<Routes>` inside a `BrowserRouter`.
- **Structure:**
  - `src/routes/paths.ts`: every URL is built here. Screens link through it and never hand-write URL strings.
  - `src/routes/AppRoutes.tsx`: one route table. Each entry declares its path, allowed roles, sidebar item, and whether it renders inside the desktop App Shell. One guard redirects a role that can't open a screen to that role's home (Staff/Admin go to `/`, Instructor goes to `/qr/scan`). Unknown paths show a not-found screen.
  - Each screen is a `React.lazy` chunk.
- **Student Number is the public identifier in URLs** (`/students/:studentNumber`), not the internal record ID, matching ADR-005.
- Screens keep their own in-page role checks as a second layer. The route guard is a UX and readability boundary, not the security boundary; Laravel/Sanctum will enforce roles server-side (Phase B2+).

## Alternatives Considered
- **Query-param routing (`?screen=X`)**, what the temporary scaffold used. Rejected: it doesn't map onto ADR-008's feature folders, blocks per-screen code-splitting, forces role checks into a hand-written switcher, and handles nested/dynamic records (`/students/…/history`) awkwardly.
- **TanStack Router.** Stronger type-safety for params and search state, but less familiar to the team and ecosystem. React Router is the Vite + React default and covers nested routes, lazy loading, and guards cleanly.
- **Hash routing (`/#/students`).** It avoids needing a server fallback, but gives uglier URLs and no real advantage on a LAN deployment we control.

## Consequences
- Every new screen adds one entry to the route table instead of its own switching logic.
- The Performance NFR benefits directly. The main bundle is about 264 kB (React + router + shell), and screens load on demand; chart.js only loads with the Dashboard (about 207 kB chunk).
- **The production web server must fall back to `index.html`** for unknown non-API paths, or deep links and refreshes will 404. Logged in `08-Logs/Issues-and-TODOs.md`.
- The mock-session `?role=` preview is kept per browser tab (sessionStorage), so in-app navigation doesn't silently reset the previewed role. It is removed with the mock session when Sanctum lands.
- **Canonical documents need updating:** the Project Plan's tech-stack section and the Frontend Context Brief don't name a routing library. Add React Router and the path-based convention there so the vault and canonical docs don't drift (see `09-References/Canonical-Documents.md`).

## Clarification — Thursday, October 8, 2026 — 02:15 PHT

`from` and `to` on the Visit Log are the exception to the general query-as-screen-state rule. They
are one-time **entry filters** produced by the Dashboard calendar's “View visits” link: valid values
set the initial custom range and remain reloadable until the user changes the range in the Visit Log.
That in-screen change clears only `from` and `to` with replace navigation, preserving unrelated
parameters and keeping Back directed to the previous screen. No search, sort, page, or disposition
state is placed in the URL.

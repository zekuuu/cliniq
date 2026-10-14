# routes/

Path-based routing with React Router (ADR-012).

- `paths.ts`: every URL in the app. Link through these builders, never hand-written strings.
  Path = which screen, query = that screen's state.
- `AppRoutes.tsx`: the route table. Each entry has its path, allowed roles, highlighted sidebar
  item, and whether it renders inside the App Shell. Screens are lazy-loaded chunks. A new
  screen gets one entry here.
- `NotFoundPage.tsx`: fallback for unknown paths, with Back and "Go to Home Screen".
- `paths.ts` also exports `homePathFor(role)`, the role's home screen, used by the route guard and as the role-aware Back fallback.
- `BackNavigation.test.tsx`: the route-coverage test; every route renders Back or is in its `NO_BACK` allowlist (ADR-024).

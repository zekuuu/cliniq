# routes/

Path-based routing with React Router (ADR-012).

- `paths.ts`: every URL in the app. Link through these builders, never hand-written strings.
  Path = which screen, query = that screen's state.
- `AppRoutes.tsx`: the route table. Each entry has its path, allowed roles, highlighted sidebar
  item. Every screen renders inside the App Shell. Screens are lazy-loaded chunks. A new
  screen gets one entry here.
- `NotFoundPage.tsx`: fallback for unknown paths, with Back and "Go to Home Screen".
- Both roles' home screen is the Dashboard (`paths.dashboard`): the route guard and Back fall back to it.
- `BackNavigation.test.tsx`: the route-coverage test; every route renders Back or is in its `NO_BACK` allowlist (ADR-024).

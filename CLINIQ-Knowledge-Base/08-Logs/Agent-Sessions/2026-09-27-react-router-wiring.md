Date/Day/Time: Sunday, September 27, 2026 — 10:01
Agent: Claude Code (Opus 5.5)
Task: Confirm React Router and wire path-based routing into every built screen and the sidebar
Status: Completed
Prompt/Request: After the URL-shape doc update, the owner asked "Did you actually fixed it now? like does all pages use it now". I said no (docs only; the `?screen=` switch was still in place) and proposed installing React Router, lazy routes, route-level role guards, real sidebar links, test updates, and an ADR. The owner replied: "Yes proceed".
Files Modified:
- cliniq-frontend/package.json, package-lock.json (added `react-router` ^7.18.4)
- cliniq-frontend/src/App.tsx (replaced the `?screen=` switcher with `BrowserRouter` + `AppRoutes`)
- cliniq-frontend/src/routes/paths.ts, AppRoutes.tsx, NotFoundPage.tsx, AppRoutes.test.tsx (new)
- cliniq-frontend/src/layouts/navigation.ts, Sidebar.tsx, AppShell.tsx (nav items carry routes; `<Link>` instead of `#main-content`; built screens now clickable)
- cliniq-frontend/src/lib/mocks/session.ts (`?role=` preview persisted per tab)
- cliniq-frontend/src/components/ui/buttonClassName.ts (new), Button.tsx, components/index.ts (button styling reusable on router links)
- Pages/APIs now take the record from the URL: StudentProfilePage + studentProfileApi, StudentFormPage + studentFormApi (edit mode now comes from the route instead of `?mode=edit`), VisitDetailPage + visitDetailApi, ExcuseLetterPage + excuseLetterApi, NewVisitEntryPage + newVisitApi, IncidentEntryPage + incidentEntryApi (`studentId` prop renamed to `studentNumber`)
- Link wiring: QrMobileHubPage (quick actions carry the scanned Student Number), VisitLogListPage ("View Detail" links to `/visits/:id`), StudentProfilePage ("Edit" links to `/students/:n/edit`)
- Tests: src/test/setup.ts, src/test/renderWithRouter.tsx (new); router-wrapped VisitLogList*, StudentProfile*, QrMobileHub, AppShell tests; updated href/Edit/edit-mode assertions
- Docs: Development-Phases.md §0, Frontend-Loop-Engineering.md (F0 note), Tech-Stack.md, Environment-Setup.md, Frontend-Issues-and-TODOs.md, ADR-012 (new), Frontend-Changelog.md
Changes Made:
- Routes: `/`, `/students`, `/students/new`, `/students/incomplete`, `/students/:studentNumber`, `/students/:studentNumber/edit`, `/visits`, `/visits/new?student=`, `/visits/pe-referral`, `/visits/:visitId`, `/visits/:visitId/excuse-letter`, `/incidents/new?student=`, `/qr/scan`, plus a not-found fallback.
- Role access is declared per route. Staff can open everything. Admin can open only `/` (Reports isn't built yet). Instructor can open only `/qr/scan` and the read-only profile, and never gets the shell. A disallowed route redirects to the role's home screen.
- Each screen is a lazily-loaded chunk. The Vite >500 kB warning is gone: the main bundle is 264 kB and the Dashboard chunk is 207 kB (chart.js).
- Sidebar: Dashboard, Students, Visits, Incidents (opens a new incident, since no incident list exists yet), and QR Lookup are now live links. Follow-Ups, Inventory, Reports, Accounts, and Backup stay "Soon".
Reason: Routing was the remaining half of a Development-Phases §0 blocker. Screens were reachable only through a temporary query-param switch, with no working navigation and no code-splitting.
Testing Performed:
- `npx tsc -b`: clean.
- `npx vitest run`: 28 files, 89 tests passed, including 7 new route tests (path → screen, sidebar navigation, `:studentNumber` resolution, unknown-student error, Admin redirect, Instructor redirect/no shell, not-found).
- `npm run build`: passed, with no chunk-size warning.
- `npx eslint src`: 0 errors, 1 warning (in `FollowUpPrompt.tsx`, which this change didn't touch).
- `vite preview` + curl: `/`, `/students`, `/students/2026-00001/history`, `/visits?dateRange=last30days`, `/qr/scan` all return 200 with the app shell HTML.
Known Issues:
- The production LAN server needs an `index.html` history fallback (logged in Frontend-Issues-and-TODOs).
- Student List rows don't link to profiles yet (logged; decide during #6 Audit).
- `?mock=` debug params are dropped on in-app navigation (expected; logged).
- The routes changed how several already-built screens pick their record, so each screen's Phase 2 Audit should re-check it (logged).
- Canonical docs (Project Plan tech stack, Frontend Context Brief) still need React Router added (flagged in ADR-012).
Next Steps: Resolve the data-fetching decision (the other §0 blocker). Update the canonical docs. Decide the Student List row → profile interaction during the #6 Audit.

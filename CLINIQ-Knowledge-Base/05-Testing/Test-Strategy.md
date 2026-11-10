# Test Strategy

- **Backend:** Pest (Laravel's modern default test framework). Feature tests drive the HTTP layer (routes, CORS, the error envelope, the session and idle middleware, logging); unit tests cover the shared helpers and the audit contract. They need no database today; from B1 on, database tests run against a scratch MariaDB database (`cliniq_test_*`), never `cliniq`, and the schema's own rules are proven by the constraint tests in `02-Architecture/Database/Checks/` (see `04-Development/Backend-Loop-Engineering.md`). `composer check` runs Pint, Larastan and Pest together.
- **Documentation:** `npm run docs:check` from the repository root (links, anchors, numbers against the Facts sheet, removed features); `npm run docs:trace -- --check` (requirement traceability).
- **Frontend:** Vitest + React Testing Library.
- Test what applies to the change being made — this isn't a full test-everything mandate at this stage, but new logic (especially the stock-flow decrement/threshold logic, the two-stage incident flow, and Follow-Up status transitions) should get coverage given how easy off-by-one and state-transition bugs are to introduce there.

Bugs found and fixed get logged in `08-Logs/Frontend-Issues-and-TODOs.md` and referenced from the relevant `08-Logs/Agent-Sessions/` entry, not tracked separately.

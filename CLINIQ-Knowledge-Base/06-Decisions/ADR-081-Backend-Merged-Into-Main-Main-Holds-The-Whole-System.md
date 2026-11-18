# ADR-081: Backend merged into main; main holds the whole system

**Date:** Wednesday, November 18, 2026 — 10:07 PHT
**Status:** Accepted (requested by Zean, Wednesday, November 18, 2026; his two answers in the run's pop-up, 10:04 PHT). The merge commit is [`bc654dd`](https://github.com/zekuuu/cliniq/commit/bc654dd2ad3822668c745d6080a2532d885476e1), Wednesday, November 18, 2026 — 10:07 PHT. Partly supersedes ADR-056 (item 2 and its rejected alternative "Develop on `main`" only). Keeps ADR-057 and ADR-080.

**Note (Wednesday, November 18, 2026 — 17:25 PHT):** the Project Plan flag under Consequences is checked: `CLINIQ_Project_Plan.md` names ADR-056 only for Sanctum SPA cookie mode, which stands, and says nothing about branches or mock-only data, so it needs no change. The decision text below is not edited.

## Context
ADR-056 kept the backend on its own branch, `backend`, and off `main` until Zean reviewed and merged it, so `main` held the documents and the frontend on sample data only. On Wednesday, November 18, 2026 the backend was built and audited, phases B0 to B10; the frontend was connected to it behind a mock/API switch (ADR-080, on `feat/connect-frontend`); the loaded-data checks of the 900-student load run were done; and the 34 screenshots were on `main`.

Zean's reason for merging now: the project is moving to testing and deployment, and that work needs the whole system on one line.

## Decision
1. **The backend and the connected frontend are merged into `main`** at `bc654dd` (Wednesday, November 18, 2026 — 10:07 PHT). Before that, `main` was merged into `feat/connect-frontend` (`bf304af`), `backend` was fast-forwarded to it, and `backend` was merged into `main` with a merge commit.
2. **The frontend-only state is tagged.** Before the merge, `main` was tagged `checkpoint-frontend-only-2026-11-18` at `f250ab6` as the last state with the frontend on sample data only and no backend integration: <https://github.com/zekuuu/cliniq/tree/checkpoint-frontend-only-2026-11-18>.
3. **Working branches from now on (Zean, 10:04 PHT):** short `feat/*` branches, merged into `main`. `main` is the branch to read.
4. **The old branches are kept as they are:** `backend`, `feat/connect-frontend` and `feat/build-backend`. Zean deletes them later himself; no agent deletes them.

**What this replaces in ADR-056:** only the rules that kept the backend on its own branch and off `main`: item 2 of its decision ("A branch named `backend`") and its rejected alternative "Develop on `main`". **Everything else in ADR-056 stands:** Sanctum SPA cookie mode (item 1), the mock data layer kept (item 4), the separate backend issue list and changelog (item 7), the backend operating manual (item 8), and the rule of no migrations before the ERD was approved (item 6, released by ADR-057).

## Alternatives Considered
- **Keep the backend off `main` until deployment.** Rejected by Zean: testing and deployment need the whole system on one line, and readers of `main` saw an out-of-date system.
- **Work directly on `main`.** Offered; Zean chose `feat/*` branches merged into `main`.
- **Delete the old branches after the merge.** Not chosen: they are kept for history; Zean decides later.

## Consequences
- A reader of `main` now sees the documents, the frontend (mock/API switch, ADR-080), the backend (the Laravel API, 50 migrations, the backend tests) and the load-test tools. `README.md` and `Start-Here-For-SRS-And-Project-Plan.md` say so; the numbers to quote are in `Facts-Sheet.md`.
- New work starts on a `feat/*` branch from `main` and is merged back into `main`. The `backend`, `feat/connect-frontend` and `feat/build-backend` branches are no longer where the newest work is.
- Backend entries still go in `08-Logs/Backend-Issues-and-TODOs.md` and `08-Logs/Backend-Changelog.md` (ADR-056 item 7).
- To see the old frontend-only `main`, open the tag `checkpoint-frontend-only-2026-11-18`.
- Canonical documents that say the backend is on its own branch need the same note: flag for the Project Plan (see `09-References/Canonical-Documents.md`).

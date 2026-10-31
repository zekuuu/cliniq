# Backend Issues and TODOs

Everything open about the backend lives here: the Laravel API, the database build, the API contract, the ERD review for migrations, middleware, CORS, tooling and backend tests. Entries about the frontend, the documents or the project as a whole stay in [`Issues-and-TODOs.md`](./Issues-and-TODOs.md). The two files are separate on purpose ([ADR-056](../06-Decisions/ADR-056-Backend-Preparation-Sanctum-SPA-Cookie-Mode-Own-Branch-Nothing-Wired-No-Migrations-Before-ERD-Approval.md)): the `backend` branch edits this one and `main` edits the other, so they never conflict. An entry that touches both sides goes in the main file and names the backend entry.

**Legend, counting rule and entry format** are the same as in the main file: tags `FIX`, `AUDIT`, `DOC`, `DECIDE`, `LATER`, `NOTE` and `VERIFY`; an open entry starts `- [ ] **[TAG]**` or `N. [ ] **[TAG]**`; counts are recomputed from this file with that rule, never copied. A resolved entry changes to `- [x] **[DONE]**`, gets `Resolved <real timestamp>` and the session link, and **stays in this file** under the heading "Done" at the bottom (this file is small; it gets its own archive when it grows past about 50 entries). Every entry carries a real timestamp.

## Open work at a glance

Open: FIX 1 · AUDIT 0 · DOC 0 · DECIDE 0 · LATER 1 | Notes: NOTE 1 · VERIFY 0 | Done: 1

**Open `FIX` items:**

- [ ] **Backend foundation on the `backend` branch (prepared, not built)** (Backend preparation)

---

## Backend preparation — Saturday, October 31, 2026 — 18:30 PHT

- **[NOTE]** **About this section** (logged Saturday, October 31, 2026 — 18:30 PHT). Source: Zean, Saturday, October 31, 2026 — 18:10 PHT: prepare for backend development (a backend loop-engineering manual, the API interfaces, the ERD and the database, middleware, CORS and the implicit groundwork), on a separate branch called `backend`, touching only the backend side, with nothing connected to the frontend yet, and with the documents first made accurate with what the system actually has (the `DOC` "Check every knowledge-base document against the code before the backend starts" in the main file). His answers to Claude's questions: the ERD is reviewed first with no migrations yet; the first round is the foundation only; auth is Sanctum SPA cookie mode. Recorded as [ADR-056](../06-Decisions/ADR-056-Backend-Preparation-Sanctum-SPA-Cookie-Mode-Own-Branch-Nothing-Wired-No-Migrations-Before-ERD-Approval.md). Written: `04-Development/Backend-Loop-Engineering.md` (the backend operating manual) and `Prompt-Backend-Preparation-Oct31.md` (Parts 1 to 3). Nothing in `backend/` or `frontend/` was changed. Session: [2026-10-31-backend-preparation](Agent-Sessions/2026-10-31-backend-preparation.md)
- [ ] **[FIX]** **Backend foundation on the `backend` branch (prepared, not built)** (logged Saturday, October 31, 2026 — 18:30 PHT). Run `Prompt-Backend-Preparation-Oct31.md`, one part per session: Part 1 writes `Environment-Setup.md`, `API-Contract.md` (every mock-API function as an endpoint entry, with the rules to port) and `ERD-Review.md` (the draft checked against the mock API, with an approval checklist); Part 2 builds the Laravel foundation in `backend/` (modular folders, configuration, CORS, Sanctum SPA settings, middleware, one error format, the audit-log service contract, a health route, tooling and tests; no tables); Part 3 counterchecks and audits it. Only `backend/` changes; `frontend/` stays untouched and nothing is connected. Done when Parts 1 to 3 are finished and committed by Zean. Session: [2026-10-31-backend-preparation](Agent-Sessions/2026-10-31-backend-preparation.md)
- [ ] **[LATER]** **Migrations, sign-in, the audit table and the module APIs wait for the ERD approval** (logged Saturday, October 31, 2026 — 18:30 PHT). B1 to B10 of `Development-Phases.md` stay blocked until Zean and the team approve the ERD (ADR-056, rule 6). `ERD-Review.md` from Part 1 of the backend prompt ends in an approval checklist; after the approval the work continues on the `backend` branch in the order of `Backend-Loop-Engineering.md`. Switching any frontend module to the real API is a separate later step with its own branch and decision. Session: [2026-10-31-backend-preparation](Agent-Sessions/2026-10-31-backend-preparation.md)

---

## Done

- [x] **[DONE]** **ERD, Data Dictionary and Reference Schema lag the frontend** (logged Saturday, October 31, 2026 — 19:24 PHT). Not edited (ADR-056). None of the three holds staff patients (ADR-043, ADR-053), `birth_date` (ADR-054), extra complaints, collected-by, avoid-if-allergic, grade at the time, Acknowledge, backup locations or the stored letter wording; `ERD.md` still names `SmartTriage` and "64 mock functions" (103 now); 29 `Data-Dictionary.md` anchors do not resolve. Take the list into `ERD-Review.md`. Session: [2026-10-31-documentation-accuracy-pass](Agent-Sessions/2026-10-31-documentation-accuracy-pass.md) Listed in `02-Architecture/Database/ERD-Review.md`; the drafts stay unedited until Zean approves the changes (ADR-056). Resolved Saturday, October 31, 2026 — 19:46 PHT. Session: [2026-10-31-documentation-accuracy-pass](Agent-Sessions/2026-10-31-documentation-accuracy-pass.md)

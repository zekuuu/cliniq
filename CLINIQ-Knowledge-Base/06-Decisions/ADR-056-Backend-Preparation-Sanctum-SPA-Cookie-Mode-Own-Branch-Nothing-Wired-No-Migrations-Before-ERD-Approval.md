# ADR-056: Backend preparation: Sanctum SPA cookie mode, a separate `backend` branch, nothing wired to the frontend yet, and no migrations before the ERD is approved

**Date:** Saturday, October 31, 2026 — 18:20 PHT
**Status:** Accepted (Zean, in chat, Saturday, October 31, 2026 — 18:10 PHT, with his answers to Claude's three questions the same evening). Settles the "Sanctum mode" item that ADR-015 left to Phase B2. Does not change ADR-015's session lifetime, the lockout, ADR-048's Admin sign-out or ADR-009's folder structure.

## Context
The frontend is built on the mock data layer. The backend has never been started: `backend/` holds a README and an `.env.example`. Zean wants to prepare for backend development: a backend operating manual, a written API contract, an ERD review, and the backend foundation (routes, middleware, CORS and similar), with the documents first checked against the code so the backend starts from accurate records. He asked that the backend be built on its own branch, touch only the backend side, and not be connected to the frontend yet.

Three things were open: how the backend signs people in (ADR-015 says Sanctum API tokens and SPA cookie sessions are configured separately and leaves the choice to B2), how far the first round goes, and what to do about the database design, which is still a proposed draft that `AGENTS.md` and Phase B1 say must not become migrations until the team approves it.

## Decision
1. **Sanctum SPA cookie mode.** The browser app signs in through Sanctum's stateful (cookie) mode: a CSRF cookie route, a session cookie, stateful domains and CORS with credentials from one explicit origin read from the environment. The session lifetime is the 7 days of ADR-015 (a fixed lifetime from sign-in); the 5-failed-attempts, 30-minute lock and the Admin's 30-idle-minutes sign-out (ADR-048) are unchanged. No API tokens are issued.
2. **A branch named `backend`.** All backend work is done on it, created from the newest branch (at last check `main`). Later sessions switch to it; they never create a second one. Nothing is committed, pushed or merged unless Zean asks.
3. **Backend side only.** Code changes only in `backend/`. `frontend/` is not touched: no API client, no environment flag, no proxy, no test. Knowledge-base files may change only for logs, the new backend documents and the READMEs and checklists that describe the backend.
4. **Nothing is wired to the frontend yet, and the mock data layer stays.** The backend is proven with its own tests. `frontend/src/lib/mock-db/` (the mock API, its data, `mock-db.json` and its tests) is **never removed, emptied, renamed or edited** by backend work: it is what the frontend runs on, the executable spec the backend copies, and the source of the future development seeder (Zean, Saturday, October 31, 2026 — 18:36 PHT). Switching a frontend module to the real API is a later step with its own branch and decision, and even then the mock stays behind a per-module switch (ADR-006). **Zean's reason (18:39 PHT): the mock database is the reference the backend phases are built from, and it stays as that reference even after the backend is integrated. It is removed only when Zean says so, once he is sure everything in the backend is good.** No agent removes it on its own judgement, however complete the backend looks.
5. **First round is the foundation only:** the Laravel scaffold, the modular folders (ADR-009), configuration, CORS, Sanctum SPA configuration, middleware, one error format, an audit-log service contract, a health route, tooling (tests, code style, static analysis) and the documents. No real endpoints, no stub endpoints.
6. **No migrations, seeders or models with columns before the ERD is approved.** The first round reviews the ERD against the mock API (`ERD-Review.md`) and writes the API contract (`API-Contract.md`); the draft `ERD.md`, `Data-Dictionary.md` and `Reference-Schema.sql` are not edited until Zean approves the changes. Sign-in and the audit trail need tables, so they wait for the approval; their code is written against interfaces and tested with in-memory fakes where useful.
7. **The backend has its own issue list and changelog** (Zean, Saturday, October 31, 2026 — 18:24 PHT): `08-Logs/Backend-Issues-and-TODOs.md` and `08-Logs/Backend-Changelog.md`, so backend entries are easy to find and the `backend` branch and `main` never edit the same log file. The main `Issues-and-TODOs.md` and `Changelog.md` carry a one-line pointer to them.
8. **A backend operating manual:** [`Backend-Loop-Engineering.md`](../04-Development/Backend-Loop-Engineering.md), the counterpart of the frontend one: read first, build every item, then cross-check and audit everything, with a resumable checklist.

## Alternatives Considered
- **Sanctum API tokens.** Rejected: the token would have to live in browser storage, where a script on the page can read it; the app is one browser on one clinic computer, where cookies fit. Tokens also make the CORS and logout story less clear for no gain here. Could be reconsidered if a non-browser client ever appears.
- **Let the agent compare and ask.** Not needed; Zean chose the cookie mode.
- **Foundation plus sign-in and roles in the first round.** Rejected for now: it needs the users table, which needs the approved ERD.
- **Foundation plus a stub endpoint for every route.** Rejected for now: stubs give the frontend team something to look at, but the written contract does the same without 100 routes that return "not implemented" to keep in step with the mock API.
- **Approve the ERD as it is and build migrations now.** Not chosen: the draft has provisional fields (vitals, excuse-letter fields, calendar events, issue reports and others) that the readiness checklist asks to settle in one pass, and it predates ADR-054 (birthdate) and later changes.
- **Develop on `main`.** Rejected by Zean: the backend is its own line of work and is reviewed before it merges.

## Consequences
- The "Sanctum mode" item in the Backend Readiness Checklist is settled; `.env.example` already holds the matching stateful-domain and session-domain lines, and the session lifetime and cookie settings are added during item B0.4.
- The frontend needs nothing now. When integration happens later, it will have to call the CSRF cookie route first and send credentials with every request.
- The Admin's idle sign-out is enforced on the server too (a middleware), in addition to the frontend timer, so a closed laptop lid cannot keep an Admin session alive.
- The database, sign-in and audit-table phases (B1 to B3) stay blocked on the ERD approval, as before.
- Prompts to run in a coding agent: `Prompt-Audit-Documentation-Against-Code-Oct31.md` (first), then `Prompt-Backend-Preparation-Oct31.md`.
- Session: [2026-10-31-backend-preparation](../08-Logs/Agent-Sessions/2026-10-31-backend-preparation.md)

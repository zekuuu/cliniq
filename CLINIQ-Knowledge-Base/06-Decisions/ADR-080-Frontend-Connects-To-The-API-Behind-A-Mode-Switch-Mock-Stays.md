# ADR-080: The frontend connects to the API behind a global and per-module switch; the mock layer stays

**Date:** Sunday, November 15, 2026 — 23:22 PHT
**Status:** Accepted (Zean, in chat, Sunday, November 15, 2026 — 08:35 PHT, answering the three setup questions of `Prompt-Connect-Frontend-To-API-Nov15.md`; two follow-up answers in the run's pop-ups, 18:12 and 22:42 PHT). It is the separate step that ADR-056 kept for later ("nothing wired"). It keeps ADR-013 (no data-fetching library), ADR-014 (one data-access layer) and ADR-079 (the clinic PC serves the API beside the frontend). Built on `feat/connect-frontend` ([run notes](../08-Logs/Connect-Frontend-Nov15/NOTES.md)).

*Note (Monday, November 16, 2026 — 22:11 PHT):* one type-only line in the mock was changed with Zean's word (pop-up, follow-up 1.4): `SeedStudent.sex?: StudentSex | null` in `frontend/src/lib/mock-db/types.ts`, because widening `Student.sex` to `StudentSex | null` (contract G4) widens the mock's `StudentInput`. No mock data, function or behaviour changed; the mock still fills in a sex. Point 6 below otherwise holds.

## Context
The backend (B1 to B10) is built and tested against the agreed contract (`04-Development/API-Contract.md`). Every screen still read only the mock data layer (`frontend/src/lib/mock-db/`), which is also the executable spec of the contract and the base of 1185 frontend tests. The project needs to run on the real API without losing the mock: for demos with no server, for the tests, and to switch one module over at a time while it is checked.

## Decision
1. **Zean's three answers (08:35 PHT).** (a) The work is built on a new branch from `backend` called `feat/connect-frontend`. (b) The frontend chooses mock or API **per module, and with one global switch that overrides everything**, even a module set to mock. (c) All phases are built in order (S0 to S8).
2. **The switch.** Vite environment values, read by one function (`apiMode(module)` in `frontend/src/lib/api/mode.ts`) and nowhere else:
   - `VITE_API_MODE` (`mock` or `api`; empty means no global override);
   - `VITE_API_MODE_<MODULE>` for `AUTH`, `STUDENTS`, `STAFF_PATIENTS`, `SCHOOL_YEARS` (with the Archive), `VISITS` (with follow-ups, excuse letters and the PE referral), `INCIDENTS`, `INVENTORY`, `DASHBOARD` (with the calendar and holidays), `REPORTS` (with Sports Reports), `USERS`, `BACKUP`, `AUDIT`, `SETTINGS`, `ISSUE_REPORTS`, `REFERENCE`.
3. **Precedence.** When `VITE_API_MODE` is set it decides every module, in both directions. Otherwise each module reads its own value; a module with none uses the mock. Tests always start on the mock (`vite.config.ts` empties the values for Vitest).
4. **Dependencies.** A module on the API needs these on the API too, because the API needs a session and its records carry the API's ids: every module needs `AUTH`; `SCHOOL_YEARS` needs `STUDENTS`, `STAFF_PATIENTS`; `VISITS` needs `STUDENTS`, `STAFF_PATIENTS`, `INVENTORY`, `USERS`; `INCIDENTS` needs those and `VISITS`; `INVENTORY` needs `REFERENCE`; `DASHBOARD` needs `STUDENTS`, `STAFF_PATIENTS`, `VISITS`, `INCIDENTS`, `INVENTORY`, `SCHOOL_YEARS`; `REPORTS` needs `STUDENTS`, `STAFF_PATIENTS`, `VISITS`, `INCIDENTS`, `INVENTORY`. A broken combination shows a development-only banner and a console table, never a crash; the global switch never makes one. Sign-in on the API with other modules on the mock works: the mock session is started for the same username.
5. **Base URL.** `VITE_API_URL` for the two development servers (`http://localhost:8000/api`); otherwise the relative `/api`, so the clinic-PC build served beside the API works with no setting (ADR-079). The CSRF cookie route is the server root's `/sanctum/csrf-cookie`.
6. **The mock layer stays.** `frontend/src/lib/mock-db/` is not removed, emptied, renamed or edited. The app imports `frontend/src/lib/data`, which re-exports the mock and routes each connected function to the mock or to its HTTP twin in `frontend/src/lib/api/http/`, with the mock's names and return types. Adapters live in the HTTP functions, never in the screens.
7. **LRN search on the logs (Zean, 18:12 PHT).** On the API the Visit and Incident Logs match typed digits against the visible last 4 of the masked LRN; the mock keeps the full-prefix match.
8. **Full LRN on paper (Zean, 22:42 PHT).** On the API, the Print button of the Monthly report and of the Audit Log first fetches the full-LRN copy (`fullLrn=1`, which is that print's audit entry), then prints; Ctrl+P alone prints the masked copy. ADR-044 holds for the button.

## Alternatives Considered
- **Replace the mock with HTTP calls.** Rejected: the mock is the contract's executable spec and the tests' base, and demos need no server.
- **Per-module switch only, or global only.** Rejected by Zean's answer (b): both, with the global switch winning.
- **Route inside the feature `api/` files only.** Rejected: about 70 screens import the data layer directly, so most of the app would have stayed on the mock.
- **A data-fetching library.** Rejected by ADR-013; a plain `fetch` wrapper is enough.

## Consequences
- Each connected function has two implementations to keep in step: a change to an endpoint needs its HTTP function and test updated with it.
- `GET /api/audit-log` now answers in the `{ data }` envelope like every other endpoint (a backend fix found by this work, Zean's word at 22:44 PHT).
- The canonical documents that describe the data layer as mock-only need the same note: flag for `Frontend-Context-Brief` and the Project Plan (see `09-References/Canonical-Documents.md`).

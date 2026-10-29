# Sign-in

## What it is
Login and the forced password change for a new account.

## Screens and who can use them
- Login: anyone; it lists the sample accounts (`DemoAccounts.tsx`) for local demos.
- Force Password Change: an account that must change its password before it gets a session.

## Rules that matter
- Every screen needs a real sign-in; no URL parameter signs anyone in or picks a role (ADR-002, security clarification).
- A session lasts one week, with no idle timer (ADR-015).
- No password re-entry before sensitive actions (ADR-041).

## Data and API files
No `api/` folder: the pages call `authenticateMockUser` and the session functions in `src/lib/mock-db/` (`session.ts`). Sanctum replaces them in Phase B2.

## Printouts and tests
No printouts. Tests: `LoginPage.test.tsx`, `ForcePasswordChangePage.test.tsx`.

## Not built yet
- The Admin / Principal signed out after 30 idle minutes, and password reset by email when online (ADR-048). Decided, not built.
- Sanctum sign-in. Not started.

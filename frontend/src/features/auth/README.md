# Sign-in

## What it is
Login and the forced password change for a new account.

## Screens and who can use them
- Login: anyone; it lists the sample accounts (`DemoAccounts.tsx`) for local demos.
- Force Password Change: an account that must change its password before it gets a session.
- Change Password (`/account/password`, from the top bar): both roles; asks for the current password.

## Rules that matter
- Every screen needs a real sign-in; no URL parameter signs anyone in or picks a role (ADR-002, security clarification).
- A session lasts one week (ADR-015). The School Clinician has no idle timer; the Admin / Principal is signed out after 30 idle minutes, with a notice a minute before (ADR-048, `hooks/useIdleSignOut.ts`, `config.adminIdleMinutes`).
- No password re-entry before sensitive actions (ADR-041).

## Data and API files
No `api/` folder: the pages call `authenticateMockUser` and the session functions in `src/lib/mock-db/` (`session.ts`). Sanctum replaces them in Phase B2.

## Printouts and tests
No printouts. Tests: `LoginPage.test.tsx`, `ForcePasswordChangePage.test.tsx`, `ChangePasswordPage.test.tsx`.

## Not built yet
- Password reset by email when online (ADR-048). Decided, not built; "Forgot password?" is help text only.
- Sanctum sign-in (SPA cookie mode, ADR-056). Not started.

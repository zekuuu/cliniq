# Sign-in

## What it is

Login and the forced password change for a new account.

## Screens and who can use them

- Login: anyone; it lists the sample accounts (`DemoAccounts.tsx`) for local demos.
- Force Password Change: an account that must change its password before it gets a session.
- Forgot password (from Login): authenticator recovery (ADR-073); an account with no authenticator is told to ask the Admin. Wrong codes share one message and the sign-in lockout (5 failures, 5 minutes).
- Change Password (`/account/password`, from the account menu, ADR-066): both roles; asks for the current password.

## Rules that matter

- Every screen needs a real sign-in; no URL parameter signs anyone in or picks a role (ADR-002, security clarification).
- A session lasts at most one week (ADR-015). Each role is signed out after its idle setting, Staff 60 and Admin 30 minutes by default, with a warning two minutes before (ADR-048, ADR-078, `hooks/useIdleSignOut.ts`, `config.idleSignoutMinutesStaff` / `idleSignoutMinutesAdmin`).
- No password re-entry before sensitive actions (ADR-041).

## Data and API files

No `api/` folder: the pages call `authenticateMockUser` and the session functions in `src/lib/mock-db/` (`session.ts`). Sanctum replaces them in Phase B2.

## Printouts and tests

No printouts. Tests: `LoginPage.test.tsx`, `ForcePasswordChangePage.test.tsx`, `ChangePasswordPage.test.tsx`.

## Not built yet

- Nothing else decided is waiting in the frontend. "Forgot password?" is built: the username, then a 6-digit code from an authenticator app or a recovery code, then a new password (ADR-073, which replaced the email reset; accounts have no email address).
- Sanctum sign-in (SPA cookie mode, ADR-056). Not started.

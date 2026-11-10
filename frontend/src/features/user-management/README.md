# User Management

## What it is

Accounts for both roles (School Clinician and Admin / Principal) and role assignment. PE/Sports Instructors have no account (ADR-029).

## Screens and who can use them

- User Management, Add User, Edit User: Admin / Principal only (ADR-033).

## Rules that matter

- The Admin / Principal enables or disables accounts and resets passwords; the last active Admin cannot be disabled.
- An account can carry a profile picture (`profilePicture.ts`, `UserAvatar.tsx`).

## Data and API files

`api/userApi.ts`.

## Printouts and tests

No printout. Tests: `UserFormPage.test.tsx`, `UserAvatar.test.tsx`, `accounts.test.ts`, `profilePicture.test.ts`.

## Not built yet

- Disabling an account ends its sessions (ADR-048): needs the backend (B2). Password recovery is the authenticator app (ADR-073), built in `features/account/` and `features/auth/`; the Admin's Reset Password stays the fallback.

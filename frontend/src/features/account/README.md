# Account

## What it is

The dialogs opened from the header's account menu (ADR-066): Edit profile and the authenticator app.

## Screens and who can use them

- Edit profile: both roles; the user's own display name and picture. Username and role stay Admin-only. Changes are audited by field name.
- Authenticator app: both roles; set up with a QR code and 8 one-time recovery codes, shown once; Replace and Disable ask for a current code (ADR-073). The Admin should set it up.

## Rules that matter

- The authenticator is only for "Forgot password?"; sign-in itself is unchanged (ADR-073).
- No email address is stored on any account.

## Data and API files

No `api/` folder: the dialogs call the account functions in `src/lib/mock-db/`.

## Printouts and tests

No printouts. Tests: `Authenticator.test.tsx`.

## Not built yet

Storing the secret encrypted and checking codes on the server need the backend (B2).

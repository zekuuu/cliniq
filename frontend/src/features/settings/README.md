# Settings

## What it is

The Settings page, `/settings` (ADR-078): how long each role may be idle before it is signed out.

## Screens and who can use them

- Settings: Staff edit; the Admin sees the fields disabled. Two whole-minute fields, Staff and Admin, each 10 to 240 (defaults 60 and 30). Changes are audited by field name.

## Rules that matter

- Keys, pointer, scroll, touch and API calls count as activity. A "Still there?" warning with a live countdown comes two minutes before the sign-out (`hooks/useIdleSignOut.ts`).
- The 7-day session maximum stays (ADR-015, ADR-057).

## Data and API files

`SettingsPage.tsx`; the settings functions in `src/lib/mock-db/`.

## Printouts and tests

No printouts. Tests: `../idle-signout.test.tsx`.

## Not built yet

Storing the values in `system_settings` and enforcing them on the server: the backend middleware exists (`session.idle`); reading the table waits for B2.

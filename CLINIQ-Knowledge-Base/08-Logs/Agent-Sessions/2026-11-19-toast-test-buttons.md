Date/Day/Time: Thursday, November 19, 2026 — 23:38 PHT (clock read with PowerShell `Get-Date`)
Agent: Claude Code (Opus 5.5)
Task: Temporary buttons to show each kind of toast (ADR-083)
Status: Completed

## Prompt/Request

Zean, Thursday, November 19, 2026: "add test button to show toast notfi temporarily".

## Files Modified

`frontend/src/components/ToastPreview.tsx` (new), `frontend/src/App.tsx` (one import and one line), `08-Logs/Frontend-Changelog.md`, `08-Logs/Frontend-Issues-and-TODOs.md`.

## Changes Made

- A collapsed "Test toasts" panel sits at the bottom centre of every screen, Login included. It has six buttons: Success, Error, Warning, Info, With action (with a description and an "Open record" button) and Loading (it turns into "Backup recorded" after 2 s).
- The buttons go through `notify`, like the real screens.
- It renders only in the dev server (`import.meta.env.DEV`), never in tests or in the built app the clinic PC runs.

## Reason

Zean's request: a quick way to look at the toasts and their countdown line.

## Testing Performed

- `tsc -b` is clean, and ESLint and Prettier are clean on both files.
- Chromium (mock mode, Login screen): each button sent its toast, and the loading toast ended as "Backup recorded".
- The panel first sat bottom left over the dev "Demo Accounts" button, so it was moved to the bottom centre.
- No database touched; nothing committed.

## Known Issues

Temporary by request: remove `components/ToastPreview.tsx` and its import and line in `App.tsx` when done (logged as a `LATER` item).

## Next Steps

Zean tries the toasts, then asks for the panel to be removed.

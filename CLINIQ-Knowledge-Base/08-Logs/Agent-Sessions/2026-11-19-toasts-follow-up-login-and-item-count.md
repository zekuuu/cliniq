Date/Day/Time: Thursday, November 19, 2026 — 23:01 PHT (clock read with PowerShell `Get-Date`)
Agent: Claude Code (Opus 5.5)
Task: Zean's answers to the toast run's three questions (ADR-083)
Status: Partial (question 2 waits on Zean's yes to a suggestion)

## Prompt/Request

Zean, Thursday, November 19, 2026, answering the three questions of [2026-11-19-toasts-and-form-reset](2026-11-19-toasts-and-form-reset.md):
1. Login's arrival notices: "Keep message and you could add toast".
2. A toast over the pager at the end of a long list: "what do you suggest?"
3. The item count on "Visit recorded": "maybe if it doesnt floods or not overcrowded".

## Files Modified

`frontend/src/features/auth/LoginPage.tsx`, `frontend/src/features/clinic-visits/NewVisitEntryPage.tsx`, `frontend/src/test/setup.ts`, `frontend/src/features/idle-signout.test.tsx`, `frontend/src/features/clinic-visits/ItemsGiven.test.tsx`, `frontend/src/features/clinic-visits/NewVisitEntryPage.test.tsx`, `frontend/src/features/clinic-visits/LettersAndVisitsDecisions.test.tsx`, `08-Logs/Toasts-Nov19/NOTES.md`, `08-Logs/Frontend-Issues-and-TODOs.md`, `08-Logs/Frontend-Changelog.md`.

## Changes Made

- **Login:** both notices stay on the page. On arrival, one warning toast also says "Signed out after N minutes of inactivity" or "Your session has ended". The id `signed-out` keeps it to one toast, even under StrictMode's double effect.
- **"Visit recorded":** the description is now one short line of fragments joined by " · ", for example "3 items taken from stock · Follow-up created · Letter draft saved". It shows a count, never a medicine's name. The longer sentences ("An excuse letter draft was saved with it.") were shortened so the toast does not grow.
- **Tests:** `test/setup.ts` stubs `setPointerCapture` and `releasePointerCapture` (Sonner calls them when a toast's button is pressed; jsdom has neither). The idle-signout test checks the toast; the Items Given test checks the count; two tests use the new fragment wording.

## Reason

Zean's answers above.

## Testing Performed

`tsc -b` is clean, and ESLint is clean on both changed screens. Full suite from `D:\`: 1,277 of 1,277 passed. An earlier run in the same session had load timeouts, the known `[VERIFY]` of October 22. No database touched; nothing committed.

## Known Issues

Question 2 (a toast over the pager at the end of a long list) is suggested, not built. The suggestion is extra bottom space on the shell's `<main>`, so the page scrolls past the toast area. It waits for Zean.

## Next Steps

Zean answers question 2; then review, commit and push.

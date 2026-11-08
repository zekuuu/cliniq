# Authenticator: "Enabled", "Disable", and centered code boxes

Date/Day/Time: Sunday, November 08, 2026 — 17:06 PHT
Agent: Claude Code (Opus 5.5)
Task: Reword the authenticator status and Turn off, use the code boxes for Replace/Disable with a recovery-code option, and redesign the code input.
Status: Completed
Prompt/Request: "reword the Authenticator app status, not \"set up\" make it Enabled. then when trying to replace or turn off (reword as disable) the code field should be the same 6 digit input then a choice below to input recovery code. then redesign the code input fields with most intuitive design, like centered fields, correct and proper hierarchy of the texts and headers/titles, etc."
Files Modified:
- `frontend/src/components/ui/CodeInput.tsx`, `frontend/src/components/index.ts`
- `frontend/src/features/account/AuthenticatorDialog.tsx`, `frontend/src/features/account/Authenticator.test.tsx`
- `frontend/src/features/auth/ForgotPasswordDialog.tsx`
- `frontend/src/layouts/AccountMenu.tsx`
- `.claude/skills/cliniq-input-patterns/SKILL.md`, `CLINIQ-Knowledge-Base/04-Development/Skills-Setup.md`, `CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md`
Changes Made:
- Status row: "Status" with an "Enabled" success badge (or "Not set up") and "N of 8 recovery codes left". Account menu: "Authenticator app: Enabled".
- "Turn off" renamed "Disable" everywhere (button, dialog title, notice "Authenticator app disabled."); the confirming button is the destructive variant.
- Replace/Disable: dialog title names the action; centered "Confirm it is you" heading and instruction; 6-digit code boxes, with "Use a recovery code instead" below (replaces the plain "Code" text field).
- `CodeInput`: label, boxes and hint centered; boxes 48×56px, 24px digits, 3 + 3 split. New `CodeOrRecoveryField` (code boxes or recovery-code `Input` plus the swap link), shared by Forgot password and the authenticator dialog; Forgot password's code step shows the username as a centered heading.
Reason: Clearer wording ("Enabled", "Disable") and one code-entry pattern everywhere a code is asked.
Testing Performed: `npx vitest run src/features/account src/features/auth src/layouts` (69 passed, including a new test for Enabled and Disable with a recovery code); `tsc -b`; ESLint on changed files. Not checked in a browser.
Known Issues: None.
Next Steps: None.

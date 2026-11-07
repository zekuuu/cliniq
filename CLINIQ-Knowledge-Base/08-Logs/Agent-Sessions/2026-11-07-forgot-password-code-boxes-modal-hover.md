Date/Day/Time: Saturday, November 07, 2026 — 13:04 PHT (local clock, UTC+8)
Agent: Claude Code (Opus 5.5)
Task: Forgot password checks the username first, with code boxes; plain X on dialogs; field hover only on the field; consistent X hover; cleaner dialogs
Status: Completed
Prompt/Request: Zean, in chat:
- "in login page, forgot password should validate the username first before asking the 6 digit code. then also redesign the code input like the modern ui". Zean answered "Check the account first" when asked whether to reveal the account.
- "for all modal X close button on top right, change it to only X icon no any circular outline"
- "fix all UX when hovering to label only, it hovers to the field itself"
- "keep consistent of the hover colors of X icon. Then also all modals looks slop, I think because of the horizontal line the unaligned title, etc."

Files Modified:
- New: `frontend/src/components/ui/CodeInput.tsx`.
- Changed: `frontend/src/features/auth/ForgotPasswordDialog.tsx`, `frontend/src/lib/mock-db/api.ts` (`checkRecoveryAccount`, three messages, shared failure counting), `frontend/src/features/account/AuthenticatorDialog.tsx` (code boxes at setup), `frontend/src/components/ui/Modal.tsx`, `frontend/src/index.css` (`hover-field` variant), `frontend/src/components/ui/Input.tsx`, `Textarea.tsx`, `dropdownClassName.ts`, `frontend/src/components/index.ts`.
- Tests: `features/account/Authenticator.test.tsx`, `features/auth/LoginPage.test.tsx`, `components/ui/Select.test.tsx`.
- Documents: an amendment note on ADR-073; skills `cliniq-modal-patterns`, `cliniq-input-patterns` and `cliniq-interactive-states`; `Skills-Setup.md`; `Changelog.md`.

Changes Made:
- **Forgot password in three steps.** Step 1 asks for the username, checked first: no account, disabled, or no authenticator, each saying which. Each failure counts toward the 5-try lockout. Step 2 shows the account name and six code boxes that continue by themselves after the sixth digit, or "Use a recovery code instead". Step 3 asks for the new password. A wrong code clears the boxes and gives the general message.
- **`CodeInput`.** Six 48×44 boxes over one invisible input. The current box gets a brand-green ring and a blinking caret, which stays still under reduced motion. Digits only; paste and the phone's code autofill work. It is also used for the authenticator setup's first code.
- **Dialogs** (shared `Modal`): the line under the title is gone. The title is 18px and centred with the X. Title, X and content share a 24px edge. The dialog has a larger radius and the overlay shadow. The X is a plain icon, no circle, `brand-green-dark` on hover like the fields' clear buttons and the remove buttons.
- **Hover on fields:** browsers give a field :hover while its label is hovered. The new `hover-field:` variant ignores that, so only the field itself responds. It is applied to Input, Textarea and the shared dropdown trigger used by Select, MultiSelect, Combobox and the date pickers.

Skill changes (old to new):
- `cliniq-modal-patterns`: no rule about the look, and the code had a bordered header and a circled X. Now there is no header rule, a plain X, and one 24px edge.
- `cliniq-input-patterns`: "hover response". Now the hover is on the field only, through `hover-field:`, and one-time codes use `CodeInput`.
- `cliniq-interactive-states`: icon actions change colour. Now every X uses the same `brand-green-dark` hover.

Reason: Zean, in chat, Saturday, November 7, 2026.

Testing Performed:
- `Authenticator.test.tsx`: the Login flow through the code boxes (6 boxes, the sixth digit continues); the unknown-username and not-set-up messages before any code is asked for; the recovery-code switch; `checkRecoveryAccount` messages and the lockout after 5 failures.
- `LoginPage.test.tsx`: the dialog opens on the username alone.
- `Select.test.tsx`: the trigger now uses `hover-field:`.
- Chrome (playwright-core in the session scratchpad, not the repo; no Edge): hovering the Username label leaves the field's border #e0e0e0, while hovering the field turns it green #039935. The X turns rgb(3, 84, 25) on hover. Screenshots of the code boxes and of the new dialog were checked.
- Typecheck 0 errors, lint 0 errors. Full run: 1137 passed, 3 failed (1140). The 3 failures are the existing calendar and Student Health Record tests from commit `1b50a113`.

Known Issues: the account check names accounts that exist (accepted, see the ADR-073 note).

Next Steps:
- Backend branch: a "check recovery account" endpoint with the three messages, sharing the sign-in lockout.

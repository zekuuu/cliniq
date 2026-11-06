Date/Day/Time: Friday, November 06, 2026 — 11:20 PHT
Agent: Claude Code (Opus 5.5)
Task: Login page: swap the two columns (photo on the left, form on the right)
Status: Completed
Prompt/Request: "For the login page, we would like to redesign it. We're thinking of placing the logo and name on top of the Image. But first swap the 2 columns, meaning the forms will be on the right side, and the image will be on the left."
Files Modified:
- frontend/src/features/auth/LoginPage.tsx
- frontend/src/features/auth/DemoAccounts.tsx
Changes Made:
- From md up, the layout is `md:flex-row-reverse`: photo on the left, sign-in panel on the right. DOM order is unchanged (panel first), so Tab still reaches the form before Demo Accounts. Phones are unchanged (photo band on top, panel below).
- The curved seam moved to the photo's right edge and is mirrored (`right-0 -scale-x-100`), so the white still flows into the photo from the panel side.
- The dev-only Demo Accounts button sits at the photo's bottom-left from md (it would otherwise sit under the seam next to the panel); bottom-right on phones as before.
Reason: Requested as step one of the login redesign. Moving the logo and name onto the photo is the next step and was not done here.
Testing Performed: `npx eslint src/features/auth` clean; `npx vitest run src/features/auth` 20/20 passed (a first cold run timed out on 9 tests; the rerun passed all).
Known Issues: None. No browser screenshot taken.
Next Steps: Place the MCA logo and CLINIQ name on top of the photo, as the requester described.

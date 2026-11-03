Date/Day/Time: Monday, November 02, 2026 — 05:39 PHT
Agent: Claude Opus 5.5 (Claude Code)
Task: Better hierarchy on the Login form
Status: Completed. Not committed.
Prompt/Request: "still not resolve, apply better hierarchy", with a screenshot of the Sign In form.
Files Modified: `frontend/src/features/auth/LoginPage.tsx`, `LoginPage.test.tsx`, `Design-System.md`, `Changelog.md`.
Changes Made: "Forgot password?" was bold brand green and sat before the Sign In button, so it competed with it. Sign In now follows the fields. The link sits centered below it in regular `text-secondary`, turning green and underlined on hover. Tab order is now Password, Sign In, Forgot password.
Reason: Sign In is the one main action on the page; forgotten-password help is secondary.
Testing Performed: New LoginPage test failed first, then passed. Typecheck 0, lint 0, 952 of 952 tests.
Known Issues: The request did not name the element; the fix assumes the link is what looked wrong. Not viewed in a browser.
Next Steps: None.

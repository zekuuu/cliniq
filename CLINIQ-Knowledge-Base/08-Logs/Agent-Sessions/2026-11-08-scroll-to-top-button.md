# Scroll to top button

Date/Day/Time: Sunday, November 08, 2026 — 17:15 PHT
Agent: Claude Code (Opus 5.5)
Task: Add a screen-wide scroll-to-top arrow that blocks almost nothing and appears when it is useful.
Status: Completed
Prompt/Request: "then add a screen-wide scroll to top arrow icon, make sure it doesnt mostly block anything in the screen. then make it appear maybe if you think when it's most appropriate"
Files Modified:
- `frontend/src/layouts/AppShell.tsx` (`ScrollToTopButton`), `frontend/src/layouts/AppShell.test.tsx`
- `CLINIQ-Knowledge-Base/08-Logs/Changelog.md`
Changes Made:
- A 40px round button with the `arrowUp` icon, fixed 16px from the bottom-right, on every app-shell screen. Pages keep a 32px side gutter (`sm:px-8`), so it sits mostly in the gutter. z-20: under the sticky header (z-30) and dialogs.
- It appears once the window has scrolled more than one viewport height (when getting back up is real work) and fades out otherwise. While hidden it is `invisible`, so it is out of the Tab order.
- Click: scrolls to the top (smooth, or instant with reduced motion) and moves focus to `#main-content`.
- Hidden in print.
- Named "Scroll to top", not "Back to top": the Back route-coverage test (`/^Back/`) matched "Back to top", and "Back" means page navigation in CLINIQ (`cliniq-back-navigation-patterns`).
Reason: Long lists and records need a quick way back up.
Testing Performed: Full `npx vitest run`: the first run failed 2 Back tests on the "Back to top" name; after the rename, `src/routes/BackNavigation.test.tsx` and `src/layouts` 100 of 100 pass, including a new test for the show threshold, scroll and focus; `tsc -b`; ESLint. Not checked in a browser.
Known Issues: None.
Next Steps: None.

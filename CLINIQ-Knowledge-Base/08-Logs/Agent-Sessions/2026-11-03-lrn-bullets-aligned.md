Date/Day/Time: Tuesday, November 03, 2026 — 20:42 PHT
Agent: Claude Opus 5.5 (Claude Code)
Task: Line the LRN mask bullets up with the digits
Status: Completed. Not committed. Not seen in a browser.
Prompt/Request: "fix, they're not visually aligned", with screenshots of `••••••••0022` on a list and under student names.
Files Modified: `frontend/src/index.css`, `frontend/src/components/ui/MaskedLrn.tsx`, `frontend/src/features/student-records/StudentFormPage.tsx`, `review-round-2-parts-2-3.test.tsx`, `cliniq-display-privacy`, `Skills-Setup.md`, `Frontend-Changelog.md`.
Changes Made: The bullet sits at lowercase height, below the centre of the digits. A new `lrn-mask` class turns on Inter's case alternates (`case`), which raise it to the capital and digit centre, and keeps the page's `cv11` and `ss01` (the property replaces, never adds). Used by `MaskedLrn` and the Student form's duplicate list, the two places a mask is drawn on screen. The text stays one piece, so lookups and screen readers are unchanged.
Reason: Zean's request.
Testing Performed: Test first (the mask carries `lrn-mask`), seen failing. Typecheck 0, lint 0, 999 of 999, build 0. Whether Inter's `case` set includes the bullet was not checked in the font file (no font tool here) or a browser.
Known Issues: If the bullet does not move on screen, the fallback is a raised span around the bullets, which splits the text and needs about 13 tests changed. Printouts do not use the class.
Next Steps: Zean checks it on screen.

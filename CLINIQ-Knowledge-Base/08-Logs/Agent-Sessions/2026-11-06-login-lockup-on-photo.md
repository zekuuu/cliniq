Date/Day/Time: Friday, November 06, 2026 — 11:43 PHT
Agent: Claude Code (Opus 5.5)
Task: Login page: move the logo and CLINIQ name onto the photo (left side), centered
Status: Completed
Prompt/Request: "What we want is the logo and name to be on the left side. Maybe centered, not sure how to design it." (Follows [the column swap](2026-11-06-login-columns-swapped.md).)
Files Modified:
- frontend/src/features/auth/LoginPage.tsx
- frontend/src/features/auth/LoginPage.test.tsx
Changes Made:
- New `PhotoLockup` (md and up): the MCA logo (112px, 128px from lg) above "CLINIQ" in the brand serif (text-5xl, 6xl from lg) and "Mendez Christian Academy", all white, centered in the photo. Right padding offsets the seam so it reads as centered in the visible photo.
- A soft radial brand-green-dark glow (65% at the centre, fading out) sits behind the lockup, plus drop shadows, so the white text keeps its contrast on the photo's lighter top half.
- The panel lockup is now phones only (`md:hidden`): the phone photo band is 144px tall, too short for the lockup. From md the panel holds only the form and footer.
- The test now expects two lockups in the DOM (CSS shows one at a time).
Reason: Design choice made by the agent at the requester's invitation ("not sure how to design it"): centered and enlarged, as a hero on the photo.
Testing Performed: `npx eslint src/features/auth` clean; `npx vitest run src/features/auth` 20/20 passed. No browser screenshot (Playwright is not installed in frontend/).
Known Issues: White-on-photo contrast is not measured: it relies on the glow, so check it by eye. If the stand-in photo is replaced, recheck it.
Next Steps: Requester to review it in the browser and adjust size or position if wanted.

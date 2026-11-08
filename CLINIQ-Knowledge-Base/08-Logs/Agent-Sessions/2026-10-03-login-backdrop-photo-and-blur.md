Date/Day/Time: Saturday, October 03, 2026 — 02:21 PHT
Agent: Claude Code (Opus 5.5)
Task: Place the requester's campus photo as the Login backdrop and blur it.
Status: Completed
Prompt/Request: Follow-up to `2026-10-03-login-backdrop-and-demo-accounts.md`. "I copied the image to frontend\public, just rename them", then "blur the image".
Files Modified:
- frontend/public/brand/login-backdrop.jpg (renamed from `frontend/public/opera_Df7WlzAO7a.jpg`: the aerial photo of the three-storey main building, 1920×1049)
- frontend/public/brand/campus-courtyard.jpg (renamed from `frontend/public/opera_6FHqNtK2Rs.jpg`: the courtyard/flagpole photo, 1920×1080; currently unused)
- frontend/src/features/auth/LoginBackdrop.tsx
- CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md
- CLINIQ-Knowledge-Base/08-Logs/Frontend-Issues-and-TODOs.md
Changes Made:
- Identified which screenshot was which by viewing both, then renamed them into `public/brand/`. The building shot is now the live backdrop.
- Blurred the photo with CSS (`blur-sm`, 8px) instead of editing the file, so a future official photo dropped at the same path is blurred automatically. The image is scaled to 110% inside the clipped backdrop so the blur's soft edges fall outside the viewport, rather than fading into a green fringe from the fallback gradient.
- Updated the `LOGIN_BACKDROP_SRC` comment: the file is a frame from a campus drone video, standing in until an official photo is available.
Reason: The requester supplied the photo and wanted it de-emphasized behind the sign-in card.
Testing Performed:
- Playwright MCP on the Vite dev server: the photo loads (naturalWidth 1920) at 1440×900 and 375×667, the card is fully legible, and after the blur there's no edge fringe and the Demo Accounts trigger doesn't overlap the card.
- Typecheck passed; focused Vitest (`src/features/auth`, `App.test.tsx`): 2 files, 17 tests passed. The full suite wasn't re-run for this CSS-class-only change (it passed, 225/225, in the previous session).
Known Issues:
- `campus-courtyard.jpg` is unused but still ships in the build (~0.9 MB), since Vite copies all of `public/`. Delete it if it isn't wanted as an alternative.
- The backdrop is ~0.9 MB; fine on the LAN, though a smaller export would load faster on the shared workstation.
- The photo is a video frame, not an official school photo; swap it when one exists.
Next Steps: Replace with an official photo when available (same path, no code change).

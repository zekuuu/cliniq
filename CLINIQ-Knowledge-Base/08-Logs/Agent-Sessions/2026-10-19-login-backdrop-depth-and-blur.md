# Agent Session — Login backdrop: gradient tint and lighter blur

Date/Day/Time: Monday, October 19, 2026 — 02:15 PHT (system clock)
Agent: Claude Code (Opus 5.5)
Task: Give the Login photo side depth (option 1) and reduce the blur so the building is recognizable (option 2).
Status: Completed
Prompt/Request: Zean: "do 1 and 2. for the blur it should be noticeable that image is low reso". Read as: the blur should be light enough to show the building but strong enough that the stand-in photo's low resolution is **not** noticeable. Zean can say if the opposite was meant.
Files Modified:
- `frontend/src/features/auth/LoginBackdrop.tsx`
- `CLINIQ-Knowledge-Base/03-Design/Design-System.md`
- `CLINIQ-Knowledge-Base/08-Logs/Issues-and-TODOs.md`
- `CLINIQ-Knowledge-Base/08-Logs/Changelog.md`
- `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-10-19-login-backdrop-depth-and-blur.md` (this file)
Changes Made:
- Overlay: flat `brand-green-dark/45` → bottom-to-top gradient `brand-green-dark` 75% → 35% at 55% → 20% at the top.
- Blur: `blur-sm` (8px) → `blur-[3px]`. Overscan `scale-110` → `scale-105`, which also lowers the upscale (2560 × 1440 now about 1.44× instead of 1.51×).
- Shared by Force Password Change, which gets the same look.
How 3px was chosen: 1:1 crops at 2560 × 1440 (the worst upscale) with the new gradient at 0, 2, 3, 4 and 6px. At 0px the video's compression softness and blocky railings are visible; at 2px traces remain; at 3px they are gone and the windows, railings, stairs and roof are still recognizable. Smaller screens upscale less, so 3px is the strictest case.
Testing Performed: `npx vitest run src/features/auth` 9 passed; `eslint` clean; Playwright on Chromium 1228 (not Edge) at 1366×768, 1920×1080, 390×844 and 375×667 plus 2560×1440: axe-core 4.13 no violations on Login and the signed-out Privacy Policy; no page scroll at desktop; Force Password Change checked at 1366. The white panel, the card and the opaque Demo Accounts button do not depend on the photo for contrast.
Known Issues: When the official, higher-resolution photo arrives (same path), 3px can be lowered further.
Next Steps: None.

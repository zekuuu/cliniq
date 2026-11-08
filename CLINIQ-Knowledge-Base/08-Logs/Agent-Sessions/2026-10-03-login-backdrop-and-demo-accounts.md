Date/Day/Time: Saturday, October 03, 2026 — 02:11 PHT
Agent: Claude Code (Opus 5.5)
Task: Polish the Login screen (photo backdrop with brand fallback, CLINIQ brand lockup on the card) and move the demo accounts into a dismissible trigger + panel.
Status: Completed (real school photo not yet placed — see "Where the real photo goes")
Prompt/Request: "Improve the Login screen's UI (frontend/src/features/auth/LoginPage.tsx) — restrained, appropriate for a school clinic system, not a flashy AI-generated landing page. Also convert the demo accounts from a permanently-visible section into a dismissible bubble/trigger pattern." Specifics: a swappable real-photo backdrop loaded from one documented path, with a brand-token fallback and no sourced/generated placeholder; CLINIQ's own brand lockup on the card; no third-party sign-in or "Remember me" (ADR-015 already gives 1-week sessions); demo accounts and the "Frontend demo only…" disclaimer in one self-contained trigger + panel following KeyboardShortcuts.tsx; login form logic unchanged. Mid-session, the requester shared two drone photos of the campus and said "choose from here".

## Where the real photo goes

**Drop the photo at `frontend/public/brand/login-backdrop.jpg`** (served as `/brand/login-backdrop.jpg`). No code change is needed; the path is the `LOGIN_BACKDROP_SRC` constant in `frontend/src/features/auth/LoginBackdrop.tsx`, commented as a temporary placeholder for an actual photo of Mendez Christian Academy. Until a file is there, the brand-green gradient shows.

Of the two photos the requester shared, the first (aerial view of the three-storey main building above the open court) was recommended: one clear subject, and the centered card falls over the empty court. The second was not: tilt-shift blur, a large foreground bush, and a video mute icon burned into the bottom-right corner, where the Demo Accounts trigger sits. A pasted chat image can't be written to disk by the agent, so the requester needs to save it at that path.

## Decisions taken with the requester (before building)

- **Premise correction.** `KeyboardShortcuts.tsx` no longer has a trigger button: its floating bottom-right "Shortcuts" button was removed in `2be7738` because it covered the last rows of long tables, and it now opens the shared `Modal` from the shell header. `StaffShortcuts.tsx` is the Dashboard's Backup/New Visit strip, unrelated. Chosen: revive that removed floating button's styling as the Demo Accounts trigger, opening the shared `Modal` (there are no tables on Login to cover).
- **Brand lockup:** reuse the shared `BrandLogo` (`layouts/Sidebar.tsx`) as-is, without the HealWare attribution line.
- **Scope:** Login only. Force Password Change keeps its plain layout; logged as a follow-up.

Files Modified:
- frontend/src/features/auth/LoginPage.tsx
- frontend/src/features/auth/LoginBackdrop.tsx (new)
- frontend/src/features/auth/DemoAccounts.tsx (new)
- frontend/src/features/auth/LoginPage.test.tsx (new)
- CLINIQ-Knowledge-Base/04-Development/Frontend-Loop-Engineering.md (note on #1 Login)
- CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md
- CLINIQ-Knowledge-Base/08-Logs/Frontend-Issues-and-TODOs.md

Changes Made:
- `LoginBackdrop`: a full-bleed, `aria-hidden` layer behind the page. The base is always a `brand-green-dark` → `brand-green` gradient; the photo `<img>` (object-cover) sits on top and unmounts on `onError`, so a missing file shows the gradient with no broken-image icon. No blur, overlay effects, illustration, or animation. `brand-yellow` was deliberately not used: it has no functional job on this screen, and a yellow/green blend would read as decoration.
- `LoginPage`: the card (unchanged `Card`, `max-w-md`) now opens with `BrandLogo`, a divider, then the existing "Sign In" heading and sentence; the separate "CLINIQ" eyebrow was dropped because the lockup carries it. The form, validation, lockout messaging, and `submit()` are untouched. The page gets bottom padding so the floating trigger never covers the Sign In button.
- `DemoAccounts`: the floating bottom-right "Demo Accounts" button (the old Shortcuts button's classes, visible at all widths with `aria-haspopup="dialog"` and the `users` icon) opens the shared `Modal` titled "Demo accounts". The Modal holds the simulated-authentication disclaimer, the synthetic-credentials note, and the same four accounts, with a `Close` button that takes initial focus (`data-autofocus`). Deleting this one component, plus its import and `<DemoAccounts />` in LoginPage, removes the button and the disclaimer together.
- Found during live verification and fixed locally: at 375×667 the dialog was 793px tall and centered in a non-scrolling overlay, so both ✕ and Close were off-screen. `DemoAccounts` now passes `max-h-[calc(100dvh-2rem)] overflow-y-auto` through the Modal's existing `className` prop. The shared `Modal` itself was not changed (logged in Frontend-Issues-and-TODOs).
- No "Remember me", no third-party sign-in buttons, no "Forgot password?" link.

Reason: The demo accounts and disclaimer were permanent page content. The screen had no brand presence beyond a text eyebrow, and the requester wanted a professional, restrained login page that can show the school's own photo.

Testing Performed:
- `npm run typecheck`: passed.
- `npm test`: 50 files, 225 tests passed (includes the new `LoginPage.test.tsx`: demo panel hidden on load, opens with all four accounts and the disclaimer, closes via Close and Escape with focus returned; backdrop `img` error leaves the gradient layer).
- `npm run build`: passed.
- Playwright MCP, live on the Vite dev server:
  - Without a file: the dev server answers the missing path with the SPA's `index.html` (200, text/html), not a 404. The image fails to decode, `onError` removes it, and the gradient shows (screenshot at 1440×900).
  - With an image: the request was intercepted with `page.route` and served the repo's existing `public/MCA_Logo.png` bytes, only to prove the photo layer renders full-bleed under the opaque card. Nothing was written to the repo.
  - Demo Accounts: opens; closes via Escape, a backdrop click, ✕, and Close; focus returns to the trigger; pointer cursor present. At 375×667 there's no horizontal scroll and no overlap with Sign In, and after the fix the dialog fits the viewport.
  - Login paths: an empty submit shows both inline field errors; 5 wrong passwords show the lockout alert and "Locked until 2:40 AM."; `demo.pe2`/`demo-change` reaches Change Your Password; `demo.nurse` lands on Clinic Overview. No console errors or warnings. The test lockout was cleared from the Playwright browser's storage afterwards.

Known Issues:
- The real school photo isn't placed yet (see above).
- The shared `Modal` overlay doesn't scroll, so any dialog taller than the viewport loses its close controls on a phone. Demo Accounts works around this locally; the shared fix is logged.
- `BrandLogo`'s 11px academy subtitle is below the Design-System 12px floor (pre-existing; reused as-is per the requester's choice).
- Force Password Change still uses the old plain layout, so the demo.pe2 flow changes look between the two screens.

Next Steps:
- Save the chosen photo to `frontend/public/brand/login-backdrop.jpg` and re-check the Login screen at 1440px and 375px.
- Decide whether Force Password Change should share the backdrop.
- Consider making the shared `Modal` scroll for tall content.

# Agent Session — Login layout B: full-height left panel over the school photo

Date/Day/Time: Sunday, October 18, 2026 — 18:30 PHT (system clock)
Agent: Claude Code (Opus 5.5)
Task: Rebuild the Login screen from the centered card with an overlapping lockup to a full-height white left panel, with the school photo filling the rest of the screen.
Status: Completed (one conflict left for Zean, see Known Issues)
Prompt/Request: Zean's prompt "Login screen: move to a full-height left panel over the school photo (layout "B")", which replaces `Prompt-Login-Scale-Down-and-Remove-Footer.md` and every earlier Login prompt. Defaults accepted as written: keep the blur and green overlay and only report the photo's resolution; add "Mendez Christian Academy" as one small line in the panel; under 768 px the photo becomes a short band on top; no footer on Login. Build: panel 28rem wide at desktop and 26rem at 768, about 4rem padding so the fields are 20rem, one shared left edge for the lockup, form and school line; lockup (logo about 3.5rem, CLINIQ about 1.75rem bold, in color for white); form vertically centered; Demo Accounts at the bottom right over the photo, never over the form. Report the photo's pixel size, the single path it loads from, the page edges, the privacy notice, the app-shell footer contrast and how Demo Accounts is gated. No commit, no push, no Microsoft Edge, screenshots outside the repository.

Files Modified:
- `frontend/src/features/auth/LoginPage.tsx`
- `frontend/src/features/auth/LoginBackdrop.tsx`
- `frontend/src/features/auth/DemoAccounts.tsx`
- `frontend/src/features/auth/LoginPage.test.tsx`
- `frontend/src/index.css`
- `frontend/README.md`
- `CLINIQ-Knowledge-Base/03-Design/Design-System.md`
- `CLINIQ-Knowledge-Base/08-Logs/Issues-and-TODOs.md`
- `CLINIQ-Knowledge-Base/08-Logs/Changelog.md`
- `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-10-18-login-left-panel-layout-b.md` (this file)

Changes Made:
- **Layout (A).** `main` is `flex-col-reverse` on phones and `md:flex-row` with `md:h-dvh` from 768 px. The DOM order is panel first, photo second, so Tab reaches Username, Password and Sign In before Demo Accounts (the same order as before); the photo is `aria-hidden`. Panel: `bg-background` (#ffffff, the design system's white surface; the `surface` token is #f5f5f5 gray, so it was not used), `md:w-[26rem] md:px-12` and `lg:w-[28rem] lg:px-16`, so the content column is 320 px at both. No card, no shadow, no hairline: the white panel against the dark green photo already gives a clear edge. The panel scrolls on its own (`md:overflow-y-auto`) if a viewport is ever too short.
- **Panel content.** One `max-w-[20rem]` column holds, top to bottom: the lockup, the form block (`flex-1`, vertically centered, `py-10` minimum gap) and "Mendez Christian Academy" (`text-xs text-text-secondary`). Lockup: 56 px logo box (`size-14`), CLINIQ `text-[1.75rem]` bold in `brand-green-dark`, no shadow. The logo PNG has 191 of 2131 px (9%) of transparent padding on each side, so the lockup has `-ml-[0.3125rem]` (5 px) to put the visible mark on the content edge and `gap-0.5` (2 px), which gives a 7 px visible gap, about one eighth of the logo. `BrandLogo` was not reused: its sizes are fixed for the sidebar and it stacks the school name under CLINIQ.
- **Removed.** The `Card`, the logo-over-card overlap, the white wordmark and its drop shadow, the `-mb-7`, `pt-[52px]`, `pb-20` and every size rule for the old lockup. The footer was already off Login (previous session) and stays on the app shell.
- **Photo (B).** `LoginBackdrop` takes an optional `className` (default `fixed inset-0`, so Force Password Change is unchanged); Login passes `absolute inset-0` to fill only the photo region. Blur (`blur-sm`), `scale-110` and the 45% `brand-green-dark` overlay are unchanged. Added `object-[50%_40%]` so the building, which sits at about 50% across and 40% down the frame, stays in view in tall and wide crops. The photo still loads from the one constant `LOGIN_BACKDROP_SRC = '/brand/login-backdrop.jpg'` (file `frontend/public/brand/login-backdrop.jpg`).
- **Demo Accounts (C).** The trigger moved from `fixed` to `absolute right-4 bottom-4` inside the photo region: bottom right of the viewport on desktop, bottom right of the photo band on phones. Behavior and the dialog are unchanged; the shared Modal is `fixed`, so it still covers the whole screen.
- **Page edges (F).** Cause found: `html { scrollbar-gutter: stable }` (`frontend/src/index.css`) reserves a 15 px empty gutter on Windows, where scrollbars take up space. On Login that showed as a white strip down the right edge: before the fix the photo region ended at x = 2545 of 2560 and 1905 of 1920. Added `html:has([data-login-page]) { scrollbar-gutter: auto }`; Login does not scroll on desktop, so nothing shifts. The photo now reaches x = 2560 / 1920. No dark line along the top was visible in any screenshot.
- **Error focus.** The prompt lists "a failed submit focuses the first invalid field" as something to keep, but Login never had it: at `HEAD` focus stayed on the Sign In button. Added the shared `useFocusFirstInvalid` hook and its `role="status"` announcement, like every other entry form (`cliniq-input-patterns`). Authentication, lockout, mock accounts and session behavior are untouched.
- **Tests.** The first Login test now checks: one `h1`, the CLINIQ wordmark, the school line, and no footer. Added "focuses the first invalid field after a failed submit".

Measurements (Playwright 1.60 driving the installed Chromium 1228, not Edge; screenshots in the session scratchpad, outside the repository):

| Width × height | Panel | Fields | Photo region | Photo scale vs natural | Page scroll |
|---|---|---|---|---|---|
| 2560 × 1440 | 448 px (28rem) | 320 px (20rem) | 448–2560 | 1.51× | none |
| 1920 × 1080 | 448 px (28rem) | 320 px | 448–1920 | 1.13× | none |
| 1440 × 900 | 448 px | 320 px | 448–1440 | 0.94× | none |
| 1366 × 768 | 448 px | 320 px | 448–1366 | 0.81× | none |
| 1024 × 768 | 448 px | 320 px | 448–1024 | 0.81× | none |
| 768 × 1024 | 416 px (26rem) | 320 px | 416–768 | 1.07× | none |
| 390 × 844 | full width | 320 px | 0–390 × 144 px band | 0.22× | none |
| 375 × 667 | full width | 320 px | 0–375 × 144 px band | 0.22× | none (scrolls with the lockout message, as intended) |

- Visible logo left edge vs the heading's left edge: 0.02 px at every width. The fields and the school line are 0 px from the heading's left edge.
- Logo box 56 px (visible mark about 52.6 × 46 px); CLINIQ 28 px; visible logo-to-name gap 7.07 px; CLINIQ on one line at every width.
- Contrast: CLINIQ `#035419` on white 9.19:1; school line `#616161` on white 6.19:1. The muted token `#9e9e9e` is 2.68:1, which fails, so `text-secondary` was used instead of `text-muted`.
- Logo on white: the blue shield on a transparent background reads clearly on white (the sidebar already shows it on white).
- Demo Accounts: inside the photo region and clear of the form and the panel at every width; white button with `#616161` text, 6.19:1. Dialog opens and closes.
- Photo: `login-backdrop.jpg` is **1920 × 1049**. It is shown above its natural size at 1920 × 1080 (1.13×, including the 10% blur overscan) and at 2560 × 1440 (1.51×). In the screenshots at both widths there is no visible blockiness or banding: the 8 px blur hides the upscale. Blur and overlay not changed.
- axe-core 4.13: no violations at any width, in the empty, validation-error and Demo Accounts open states.
- App-shell footer (Dashboard, 1440 and 375): present; 12 px `#616161` on `surface` `#f5f5f5`, **5.68:1** (passes 4.5:1). The previous session's note said "on white, 6.2:1"; the footer actually sits on the shell's gray `surface`. No change needed.
- Footer absent on Login at every width.

Reason: Zean chose layout B so the brand, the form and the photo each have their own space, and the form sits on plain white instead of a photo whose contrast changes from patch to patch.

Testing Performed:
- `npx vitest run src/features/auth`: 2 files, 5 tests passed.
- `npm run build` (runs `tsc -b`): passed.
- Full `npx vitest run`: 496 passed, 15 failed in 6 files (back navigation, form cancel, form focus, print documents, UI review regressions, routes). The same 15 fail at `HEAD` with this session's changes stashed, so they predate it; none are Login tests. Logged as a `FIX`.
- `npm run lint`: 5 errors and 2 warnings, none in the files changed here (conditional hooks in `DashboardPage.tsx:63–77`, refs read during render in `NewVisitEntryPage.tsx:248`). Logged as a `FIX`.
- Playwright and axe checks as above.

Known Issues:
- **Touch targets: conflict between two requests.** The shared `Input` and `Button` are 40 px tall, and so is the Demo Accounts button. The prompt asks both to "keep the input height" and for 44 px touch targets at 375 and 390. The shared components were not changed. Logged as a `DECIDE` for Zean.
- **Demo Accounts is not gated in production.** `LoginPage` always renders `<DemoAccounts />`; there is no `import.meta.env.DEV` check, so a production build shows the demo credentials. Not changed (per the prompt); logged as a `FIX`.
- **Privacy notice.** A Privacy Policy page exists (`frontend/src/features/legal/PrivacyPolicyPage.tsx`, route `/privacy-policy`, draft text in `09-References/Privacy-Policy.md`). It sits behind the login gate and is linked from the sidebar footer and the phone menu, not from Login. No link added; Zean decides.

Next Steps: Zean decides the touch-target conflict and whether Login links the privacy notice. Gate Demo Accounts before any production build. Swap in the official school photo at the same path when the school gives one (existing `LATER`).

Decisions Zean can veto: `bg-background` (white) for the panel instead of the gray `surface` token; `text-secondary` for the school line instead of `text-muted`; no hairline or shadow on the panel edge; the `py-10` minimum gap around the form block; photo focus `50% 40%`; Demo Accounts moved to the top band's bottom right on phones; error focus added to Login; the Login-only `scrollbar-gutter: auto`.

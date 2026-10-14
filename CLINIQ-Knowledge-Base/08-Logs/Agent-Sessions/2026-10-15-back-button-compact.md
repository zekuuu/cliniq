Date/Day/Time: Thursday, October 15, 2026 — 00:01
Agent: Claude Code (claude-opus-5-5)
Task: Make the Back button take less vertical space
Status: Completed
Prompt/Request: Zean pasted "Make the Back button take less vertical space": on desktop the Back row (36px, plus the page's 16px gap) pushed the header card 52px down. Fix it in the shared `BackButton`: from `sm` up about 28px tall (`sm:min-h-7`) and pulled into the top padding (`sm:-mt-3`); about 8px to the card (`-mb-2` against `gap-4`); the card at most about 24px lower than without Back; phones keep 44px and only lose 8px of gap. Don't change page padding, placement, labels, the prominent variant, behaviour, or print hiding. Check every usage (Force Password Change, Emergency, Privacy, QR hub, Student Profile, `const back` pages, `drillThroughOnly`, skeletons, focus ring, page-level `className`). Verify with before/after Chromium screenshots (viewed) and Playwright measurements at 1280/1875 and 375/390, overflow and focus-ring checks, typecheck, lint, tests, build, format check. Update the skill/Design System if they state the size, log, Changelog; no ADR edits; no commit or push.
Files Modified: `frontend/src/components/ui/BackButton.tsx`, `frontend/src/features/auth/ForcePasswordChangePage.tsx`, `.claude/skills/cliniq-back-navigation-patterns/SKILL.md`, `CLINIQ-Knowledge-Base/08-Logs/Changelog.md`, this log.
Changes Made:
- `BackButton` quiet style: `sm:min-h-9` → `sm:min-h-7 sm:-mt-3`; both styles gain `-mb-2`. The prominent style's size is unchanged. Base `fix/open-fix-and-ui-decide` at `525bb7b`.
- Force Password Change: Back sits in a block card, not a `gap-4` column, so `-mb-2` would overlap the logo; its `className="mb-4"` became `mb-2!` (8px gap, overriding the default).
- Skill: old "44px tall below `sm`, 36px from `sm` up" → new compact rule (28px from `sm` up, `sm:-mt-3`, 8px to the card, ≤24px card offset, no page-level margins). `Design-System.md` states only "44px tall on phones", still true, so it was not changed.
Reason: The Back row read as a separate empty band above the header.

Before → after (Playwright, Chromium 1228; "bar → text" = top bar's bottom edge to the middle of the Back label; "card offset" = header card top with Back minus with Back hidden):

| Screen | Width | Back height | Bar → text | Back → card | Card offset |
|---|---|---|---|---|---|
| Excuse Letter | 1280, 1875 | 36 → 28 | 58 → 42 | 16 → 8 | 52 → 24 |
| New Visit, Student Profile, Edit Student, Add Inventory Item, Privacy Policy | 1280, 1875 | 36 → 28 | 42 → 26 | 16 → 8 | 52 → 24 |
| Force Password Change (no top bar; Back inside the card) | 1280, 1875 | 36 → 28 | — | 16 → 8 | 26 → 15 |
| New Visit (form), Visit Details (detail) | 375, 390 | 44 → 44 | 46 → 46 | 16 → 8 | 60 → 52 |
| Emergency Response (prominent, `gap-5`) | 375, 390 | 44 → 44 | 46 → 46 | 20 → 12 | 64 → 56 |

Notes: Excuse Letter keeps its full 40px top padding (its wrapper has `print:py-0`, which the global `pt-10 pb-8` → 24px rule in `index.css` skips); every other screen has 24px. So the same `-mt-3` puts the Back label 42px under the bar on Excuse Letter and 26px on the others. With a 24px padding the ≤24px card-offset target needs `-mt-3`, so the label can't also be 40–44px under the bar there. Looked at side by side, 12px of air under the bar plus 8px to the card reads as the header's top line, not cramped; kept.
Testing Performed:
- Screenshots before/after viewed (scratchpad `pw/compact/`, outside the repo): New Visit 1280, Excuse Letter 1875, Force Password Change 1280, Visit Details 375, Emergency 390, each taken with Back keyboard-focused.
- No horizontal overflow on any measured screen; focus ring not clipped by any `overflow` ancestor or the sticky top bar at 1280/1875/375/390 (checked by script and in the screenshots).
- `npm run typecheck` clean; `npm run lint` 0 errors (2 pre-existing warnings); `npm run build` built; `npm test` 72 files / 477 passed before and after, nothing deleted or weakened. `prettier --check`: `BackButton.tsx` clean; `ForcePasswordChangePage.tsx` was already failing before this change (checked against `HEAD`) and was not reformatted.
- `drillThroughOnly` returns nothing, so hidden Backs leave no margin; loading skeletons render the same component, so spacing matches the loaded page.
Known Issues: Excuse Letter's top padding (40px) differs from every other screen (24px), pre-existing. Both changed pieces are already in open AUDIT entries (Back navigation; Open FIX sweep for Force Password Change), so Issues-and-TODOs was not changed.
Next Steps: none.

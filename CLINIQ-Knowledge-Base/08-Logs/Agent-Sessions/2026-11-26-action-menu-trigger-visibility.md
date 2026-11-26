Date/Day/Time: Thursday, November 26, 2026 — 21:04 PHT
Agent: Codex
Task: Refine shared action-menu trigger visibility and alignment.
Status: Completed
Prompt/Request: Zean: “improve the visibility of kebab menus, it looks out of place,” with a screenshot of the Student List header. Follow-up: “remove the border, just make the dots bit thicker”; “more, make it a bit same height as the other button”; “make dots green”; “now make it a really bit thinner, then adjust a bit for spacing between.”
Files Modified: frontend/src/components/ui/ActionMenu.tsx; frontend/src/components/icons/Icon.tsx; .claude/skills/cliniq-action-menu-patterns/SKILL.md and cliniq-interactive-states/SKILL.md; Design-System.md; Skills-Setup.md; ADR-095; Frontend-Changelog.md; Frontend-Issues-and-TODOs.md; Issues-Done-Archive.md; Facts-Sheet.md; this session log.
Changes Made: Preserved the borderless action-menu trigger. Changed its dots from thin outlined circles to slightly larger solid dark-green circles with a little more vertical spacing. Matched the adjacent 40px button height on desktop while retaining a 44px square phone target. Updated the standing component and design guidance, plus ADR-095, for the revised visual treatment. Skill difference, old → new: ghost trigger with thin neutral outlined dots and 44px target everywhere → borderless trigger with solid dark-green dots, 40px desktop and 44px phone targets.
Reason: The original dots were hard to see and appeared detached from the other header actions.
Testing Performed: Focused ActionMenu Vitest: 5 tests passed. TypeScript typecheck passed. ESLint passed with three pre-existing Fast Refresh warnings outside the changed files. Production build passed with the existing large-chunk advisory. Playwright Chromium in mock mode verified the Student List trigger at desktop and phone widths: 40×40px and 44×44px, green dot color `rgb(3, 84, 25)`, and menu opening. `git diff --check` passed.
Known Issues: None found in the trigger. Canonical document and Project Plan screenshot drift already recorded for ADR-095 remains open.
Next Steps: Review the visual change in the app and apply the existing canonical-document follow-up for ADR-095.

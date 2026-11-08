Date/Day/Time: Friday, October 2, 2026 — 00:04:25 PHT
Agent: Claude Code (Opus 5.5)
Task: Move Dashboard drill-down links onto widget names and switch to an open-link icon
Status: Completed
Prompt/Request: "I think it would be better to move the clickable to the name of each widgets, like 'Clinic visits >' then just keep its current color, then for hover effect just add underline and change color contrast. As well as changing the icon into something like this" (image: square with an arrow out of its top-right corner). Follow-ups: "Make the icons smaller"; "For due and low-stock the hover must not be gray, maybe green"; "The icon looks thin" (bolder reference image).
Files Modified:
- frontend/src/components/ui/TitleLink.tsx (new; replaces the untracked ViewAllLink.tsx, now deleted)
- frontend/src/components/ui/ListCard.tsx (new `titleTo` prop)
- frontend/src/components/ui/StatCard.tsx (doc comment)
- frontend/src/components/icons/Icon.tsx (new `externalLink` icon)
- frontend/src/components/index.ts
- frontend/src/features/dashboard/components/StatCardRow.tsx, AlertLists.tsx
- frontend/src/features/dashboard/DashboardPage.test.tsx
- .claude/skills/cliniq-interactive-states/SKILL.md, CLINIQ-Knowledge-Base/04-Development/Skills-Setup.md, CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md
Changes Made:
- Stat card labels and the Due & upcoming follow-ups / Low-stock & expiring items titles are now the links (Staff only, as before). The separate `View all →` links are gone. Frequent-visitor warnings has no list page, so its title stays plain.
- Names keep their at-rest color and show a 12px open-link icon with a bold 3px stroke (the user found the default 2px stroke too thin). The icon shares a no-wrap span with the last word so a wrapped label never leaves it on a line by itself.
- Hover: underline plus a color shift. Stat labels darken (`brightness-75`); list titles (near-black) turn `brand-green-dark`, per the request not to use grey.
- Skill change (old → new): header `View all →` link + stat-figure chevron → linked widget name + open-link icon with underline/darken-or-green hover.
Reason: User preference for linking the widget name itself, with a clearer "open" icon.
Testing Performed: `npx vitest run` (49 files, 219 tests pass); `npx tsc -b` passes; checked in Chromium through the Playwright MCP at 1440px (Staff login): wrapped labels keep the icon attached, and the list-title hover turns green.
Known Issues: The open-link icon usually means "opens in a new tab"; here it navigates in the same tab, as the user asked. Item-row links (student numbers, inventory items) keep their small chevrons; the user didn't ask for those to change.
Next Steps: Use `TitleLink` for widget drill-downs on future screens.

Date/Day/Time: Tuesday, October 20, 2026 — 22:01 PHT (system clock)
Agent: Claude Code (Opus 5.5)
Task: Underline the Back button's chevron on hover, not just the word
Status: Completed
Prompt/Request: Zean: "for back buttons, icons should also be included for underline not just the back word"
Files Modified:
- frontend/src/components/ui/BackButton.tsx — quiet variant: `hover:underline` replaced by a span holding the chevron and the label, with `border-b border-transparent group-hover:border-current`; the outer control gets `group`. The prominent variant is unchanged.
- .claude/skills/cliniq-back-navigation-patterns/SKILL.md — quiet variant rule (old: "underlined on hover" → new: one underline under the chevron and the label together).
- CLINIQ-Knowledge-Base/04-Development/Skills-Setup.md, 08-Logs/Changelog.md; this file.
Changes Made: A CSS text underline only draws under text, so the SVG chevron was never underlined. The line is now a 1px `currentColor` bottom border on one span around both, so on hover it runs from the chevron's left edge to the end of "Back" in `brand-green-dark`. Applies to every quiet Back (one shared component).
Reason: Zean's request.
Testing Performed: `tsc -b` clean; `BackButton.test.tsx` 8 passed. Browser (Playwright, Chromium, `/visits/new`, hover): at 1440 and 390 px the span's bottom border is `1px solid rgb(3, 84, 25)` (`brand-green-dark`), starting at the icon's left edge (521 = 521; 16 = 16); no text-decoration underline remains. Screenshot looked at: the line runs under "< Back" in full.
Known Issues: None.
Next Steps: None.

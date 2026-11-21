Date/Day/Time: Sunday, November 22, 2026 — 02:05 PHT
Agent: Claude Code (Opus 5.5)
Task: "/" keyboard shortcut for the top-bar search
Status: Completed
Prompt/Request: "add slash shortcut for the search"
Files Modified:
- frontend/src/layouts/TopBarSearch.tsx, frontend/src/layouts/TopBarSearch.test.tsx
- frontend/src/lib/shortcuts.ts (`SHORTCUT_KEYS.topBarSearch`)
- frontend/src/components/KeyboardShortcuts.tsx (listed as "Search students and staff (top bar)")
- CLINIQ-Knowledge-Base/06-Decisions/ADR-086-Top-Bar-Search-For-Students-And-Staff.md (item 7)
Changes Made: Pressing "/" focuses the top-bar search. It is ignored while typing in an input, textarea, select or editable area, with Ctrl, Alt or Cmd held, with a dialog open, and when the box is hidden (below 1280 px, checked with `checkVisibility`). Typing "/" inside the box types it.
Reason: Zean's request.
Testing Performed: `tsc -b` clean; ESLint clean on the changed files; layout and shortcut tests 45 of 45 pass, including the new "/" test.
Known Issues: none.
Follow-up (Sunday, November 22, 2026 — 02:09 PHT): "what about tip for slash". `Combobox` gains `shortcut`: sets `aria-keyshortcuts` and shows the shared `ShortcutHint` at the right of the field while it is empty and not focused; the top-bar search passes "/". Then "pressing slash doesnt focus": not reproduced. In Chromium at 1521 px, mock mode, signed in as demo.nurse on the Dashboard, "/" focused the box and the tip showed. Layout and component tests 110 of 110.
Then "the slash tip look like a mistake there" and "not aligned": the tip is now a 20 px key cap (border, surface background, mono "/"), centred in the field and the glyph centred in the cap (measured in Chromium: 10 px above and below, glyph 6.7 px each side). It no longer uses ShortcutHint, whose plain text stays for the tips beside labels. Also checked "/" on the Visit Log after clicking the page: it focuses the box.
Next Steps: Zean to say the page, window width and browser where "/" failed. Not committed.

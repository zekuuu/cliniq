Date/Day/Time: Sunday, October 25, 2026 — 22:22 PHT
Agent: Claude Code (Claude Opus 5.5)
Task: The Print reason becomes a tooltip; remove the Frequent-visit warning badge
Status: Completed
Prompt/Request: Zean: "Printing is done by the clinician. make this a tooltip so it doesnt break layouts. Then also remove the Frequent-visit warning badge as it is redundant and obvious for the section it is in"
Files Modified: frontend/src/components/print/Print.tsx, frontend/src/features/dashboard/components/AlertLists.tsx; tests: features/admin-read-only.test.tsx, features/dashboard/DashboardPage.test.tsx, features/dashboard/DashboardAndReports.test.tsx, features/print-documents.test.tsx, features/clinic-visits/ExcuseLetterPage.test.tsx; .claude/skills/cliniq-print-patterns/SKILL.md; CLINIQ-Knowledge-Base/04-Development/Skills-Setup.md; Changelog
Changes Made:
- `PrintButton`: when printing is unavailable, the reason ("Printing is done by the clinician." for the Admin, "Approve the letter to print it." for a draft letter) is a dark tooltip under the button. It opens on hover or keyboard focus, stays open while the pointer is on it, and Escape closes it.
- The button uses `aria-disabled` instead of `disabled`, so keyboard users can focus it and hear the reason (it is also the button's accessible description). A click does nothing. It looks as before (faded, not-allowed cursor).
- Dashboard Frequent-visitor rows no longer show the "Frequent-visit warning" badge; the section title says it. `frequentVisitorMap` is kept but no longer used on the Dashboard.
- The two print tests from the earlier change now retry `beforeprint` until the listener is attached, as the existing print tests do. Each had failed once by timing.
Skill change (old → new): `cliniq-print-patterns`: the reason was a line under the disabled button → it is now a tooltip on a focusable `aria-disabled` button.
Reason: The line under the button pushed headers out of line; the badge repeated the section title.
Testing Performed: Dashboard, Excuse Letter and Admin tests: 69/69, twice. New tests cover hover, unhover, focus, Escape and a click that doesn't print, plus no badge on the rows. Typecheck passes; lint shows only the existing warnings. Screenshots opened and checked: Admin Dashboard 1440 (hover), Admin profile 390 (keyboard focus), draft letter 390 (hover), and the Frequent-visitor panel 1440. No horizontal scroll; the tooltip stays on screen. They are kept in the session scratchpad.
Known Issues: The two old `print-documents.test.tsx` Dashboard failures (a removed heading) are unchanged.
Next Steps: None.

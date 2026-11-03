Date/Day/Time: Monday, November 02, 2026 — 15:11 PHT
Agent: Claude Opus 5.5 (Claude Code)
Task: Make the Grade level columns read clearly and look clickable
Status: Completed. Not committed. Not viewed in a browser.
Prompt/Request: Zean, with a screenshot of the new Grade level columns: "it feels like it's not well designed, then I didnt know the bars are clickable until I hover it. numbers are confusing, etc"
Files Modified: `frontend/src/features/dashboard/components/ComplaintTrends.tsx`, `ComplaintTrends.test.tsx`, `03-Design/Design-System.md`, `08-Logs/Changelog.md`.
Changes Made: Each grade is now a grey tile (`bg-surface`) that darkens on hover and turns white with a green border and card shadow when selected. Labels read "Grade 1", not "1". Empty grades print no 0; the empty tile shows it. The scale never tops out below 4 cases, so one case no longer fills a column. "Select a grade to filter the charts above." sits on the legend row. The chart's minimum width rose to 48rem (it scrolls inside the card on a phone) so "Grade 10" fits.
Reason: The grade numbers under the columns and the counts above them were both bare digits, and the zeros added a third row of them. Bars on a white card gave no sign of being buttons. A full-height bar for 1 case repeated the oversized look Zean flagged on the Sex chart.
Testing Performed: Typecheck clean, ESLint clean on `features/dashboard`, Vitest on `features/dashboard` and `lib/mock-db`: 21 files, 209 tests passed.
Known Issues: The scale floor of 4 is a judgement call; with 1 to 3 cases the bars no longer fill the tile.
Next Steps: Zean to view it on the Dashboard.

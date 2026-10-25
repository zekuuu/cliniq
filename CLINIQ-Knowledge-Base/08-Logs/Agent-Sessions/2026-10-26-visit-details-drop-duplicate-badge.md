Date/Day/Time: Monday, October 26, 2026 — 02:34 PHT
Agent: Claude Code (Opus 5.5)
Task: Visit Details: remove the disposition badge repeated in the card header
Status: Completed
Prompt/Request: (screenshot of the Visit details card: "Sent home" badge top-right and again under Disposition) "redundant here"
Files Modified:
- frontend/src/features/clinic-visits/VisitDetailPage.tsx
- CLINIQ-Knowledge-Base/08-Logs/Changelog.md
Changes Made:
- The "Visit details" card header no longer has a badge. In view mode it repeated the Disposition field below it; in edit mode it said "Editing", repeating the "Edit visit details" title (`cliniq-page-header-patterns`: no passive badge that repeats the title). The page-level status badge at the top of the screen is unchanged.
Reason: User request.
Testing Performed: `npx tsc -b` clean. `vitest run src/features/clinic-visits` and related: 4 VisitDetailPage tests ("Visit updated." never appears after Save), 2 LogbookFields edit tests and 1 ItemsGiven test fail, and they fail the same way with this change reverted, so the cause is elsewhere. They were not in the failing set on Sunday, October 25, 2026, so they likely started when the date rolled over to Monday, October 26. Not investigated in this session.
Known Issues: The Visit Details edit/save test failures above.
Next Steps: Investigate why saving a visit edit fails in tests since Monday, October 26, 2026 (a date-dependent rule or seed data is the likely cause).

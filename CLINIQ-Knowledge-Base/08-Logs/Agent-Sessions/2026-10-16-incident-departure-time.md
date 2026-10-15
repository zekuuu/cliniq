Date/Day/Time: Friday, October 16, 2026 — 06:00 PHT
Agent: Claude Code (Opus 5.5)
Task: Investigate and fix the Stage 2 "Departure time" field on Report Incident
Status: Completed
Prompt/Request: "Departure time in stage 2 cannot be set, verify if it's a bug then fix it"
Files Modified:
- frontend/src/features/emergency-response/IncidentEntryPage.tsx
- frontend/src/features/emergency-response/IncidentEntryPage.test.tsx
Changes Made:
- Departure time now validates on Complete Incident. If the field is only partly typed (for example "02:30 --" with no AM/PM), it shows "Enter the full departure time, including AM or PM." and focus moves to it, instead of completing the incident.
- The error clears as soon as the time becomes complete.
Reason:
- Verified as a real bug in Chromium and Firefox via Playwright. Typing a complete time (02:30 PM) works and saves. Typing "0230" without AM/PM leaves the field showing "02:30 --" but its value is "" (validity.badInput is true). The form then completed silently and saved the departure as the current time (or the departure date at 00:00), so the typed time seemed never to be set.
- The hidden clock popup (index.css, per cliniq-input-patterns) is unchanged: the field is still typed.
Testing Performed:
- Playwright (Chromium, Firefox) against the dev server: full time saves; partial time now shows the error and blocks completion.
- New Vitest case "blocks completion when the departure time is only partly typed"; IncidentEntryPage.test.tsx 14/14 pass; `tsc -b` clean.
Known Issues:
- Reopening a completed incident at /incidents/:id/complete does not prefill its saved hospital referral (the checkbox starts unchecked). Not changed here.
Next Steps: None.

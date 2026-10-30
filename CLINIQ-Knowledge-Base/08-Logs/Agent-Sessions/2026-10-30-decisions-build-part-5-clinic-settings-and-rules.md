# Decisions build, Part 5: clinic settings and rules

Date/Day/Time: Friday, October 30, 2026 — 03:21 PHT
Agent: Claude Code (Opus 5.5)
Task: Build Part 5 of the decisions-sheet answers (ADR-051): seven `FIX` entries.
Status: Completed
Prompt/Request: The same "Build the fixes that came out of the decisions sheet" prompt, "Parts 1 to 6", on the branch `build/decisions-sheet-answers-oct29`. Part 5: the starting numbers, follow-ups that close by themselves, vitals ranges, the Visit/Incident hint, choosing Sports Report entries, sex in the Monthly Report, required marks only where saving is blocked. Defaults D20 to D26 apply.

What each item did before (checked first):
- `config`: frequent visitor 3 visits in **30** days with the panel already on; `upcomingFollowUpDays` 7, `expiryWarningDays` 30, `topComplaints` 5 already; low stock was **strictly below** the threshold.
- Follow-ups: Overdue from the **day after** the date; nothing closed by itself.
- Vitals: only the placeholder sanity bounds ("looks unusual") and the fever flag; no age ranges.
- No Visit/Incident hint (the code waited for the nurse's wording).
- The Sports Report printed every visit and incident in its window.
- The Monthly Report had no sex counts (the Dashboard Trends already did, ADR-045).
- Required marks: after Part 2 removed the marks from Allergies and Medical conditions, every remaining mark already blocked saving.

Files Modified:
- Data layer: `frontend/src/lib/mock-db/mock-db.json` (`frequentVisitorWindowDays` 14, `followUpOverdueAfterDays` 3, `followUpAutoCloseDays` 7, `vitalsUsualRanges`, `_note` says "Starting values, nurse to confirm"; `followup-0007` moved from 3 to 4 school days ago so the seed still shows an Overdue follow-up), `types.ts` (`AgeGroup`, `VitalsUsualRanges`), `integrity.ts`, `store.ts` (migration), `selectors.ts` (`followUpDueState` with the overdue days, `withAutoClosedFollowUps`, low stock at the threshold), `api.ts` (auto-close in `view()`, usual ranges sent with `getVitalsWarningRanges`, `visitsBySex`), `dashboard.ts`, `index.ts`; `frontend/src/lib/vitals.ts` (`ageGroupOf`, `usualRangeNotes`); `components/status/followUp.ts` ("Due")
- UI: `components/forms/VitalsWarning.tsx`; `features/clinic-visits/LogbookFields.tsx`, `NewVisitEntryPage.tsx`, `VisitDetailPage.tsx`; `features/emergency-response/IncidentEntryPage.tsx`; `features/reports/SportsReportPage.tsx`, `sportsReportContent.tsx`, `ReportsPage.tsx`, `components/MonthlyTables.tsx`, `components/ReportsPrint.tsx`
- Tests: new `features/ClinicRulesDecisions.test.tsx` (14 tests, including one per form that fails if an empty marked field does not stop the save); `lib/mock-db/dashboard.test.ts`, `integrity.test.ts`, `countsAndSeed.test.ts` (the new overdue and low-stock rules)
- Docs: `Module-Overview.md`, `Screen-Inventory.md`, `frontend/src/lib/mock-db/README.md`, ADR-051 status line, Changelog, Issues-and-TODOs, Issues-Done-Archive

Changes Made:
- **Starting numbers (D20).** As listed above, each marked "starting value, nurse to confirm" in `config._note` and the mock-db README. A saved browser copy keeps its own frequent-visitor window; a reset takes the new one.
- **Follow-ups (D21).** Upcoming, Due today (on the date), Due (1 to 3 days after), Overdue (4 to 7 days after); more than 7 days after, a pending follow-up reads as Missed with "No response (closed automatically after 7 days)". Computed in the data layer's read view, so the Follow-Up List, the Dashboard and the Monthly Report agree and nothing is written by reading (the backend's daily job stays a `LATER`).
- **Vitals (D22).** `config.vitalsUsualRanges` by age group, picked by grade (Kinder, Grades 1 to 6, Grades 7 to 12) or adult for staff; pulse and blood pressure per group, temperature below 36.0 °C and oximeter below 95% for all. The note "Outside the usual range for this age (starting range, nurse to confirm): …" joins the existing warning on the Visit (temperature) and Incident (all four) forms and never blocks. A reading the sanity bounds call unusual gets only that stronger note. The fever flag is unchanged.
- **Hint (D23).** The two sentences under the form titles; Escalate to incident unchanged.
- **Sports Report (D24).** A tick per entry, all ticked on opening (screen state, not stored, so the report still holds no medical content, ADR-034); "N of M entries included; untick any that should not print"; the printout drops unticked entries. The conditions option and the print audit entry are unchanged.
- **Visits by sex (D25).** Female, Male and All students, with staff patients apart ("Staff (no sex recorded)"), on the Monthly Report screen and printout.
- **Required marks (D26).** Audited Visit, Incident, Student, Staff, Inventory, Letter, Follow-up, Account and the other forms with marks; no further change was needed (see above).

Reason: ADR-051 items 1 to 5, 8 and 10, and the seven `FIX` entries of "Decisions sheet follow-up answers".

Testing Performed:
- Typecheck pass, build pass, lint unchanged from the baseline (1 error, 2 warnings, pre-existing).
- Tests: 12 failed and 792 passed of 804; the 12 are baseline failures.
- Screens (Playwright Chromium headless shell, screenshots outside the repository): New Visit with the hint and a 35.5 °C reading, Incident Stage 1 with a pulse of 130 for a Grade 1 student, Dashboard (both roles), Follow-Up List, Sports Report, Monthly Report (both roles), at 1440, 768 and 390 px. No horizontal scroll; axe-core: no violations.

Known Issues: none new.

Next Steps: Part 6 (staff wording, extra complaints and backup locations).

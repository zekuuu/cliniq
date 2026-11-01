Date/Day/Time: Sunday, November 1, 2026 — 13:03 PHT
Agent: Claude Opus 5.5 (Claude Code)
Task: Frontend clean-up, Part 2: open frontend features and rules (D1 to D12)
Status: Completed. Nothing committed.
Prompt/Request: `Prompt-Frontend-Cleanup-Code-Nov1`, Part 2, recovered from an earlier session's transcript because the file is not on this machine. Zean: "you can now proceed to part 2 until the llast part in backend branch", then "1" (the clean-up, not phases B1 to B10). The prompt's hard limits apply: no file under `backend/`, the mock stays, no commit.
Files Modified: `frontend/` code and tests; ADR-061 (new), ADR-021 (note), `Decisions-Summary.md`, `Reference-Schema.sql`, `API-Contract.md`, `Audit-Coverage.md`, `Module-Overview.md`, `URL-Parameters.md`, the Issues and Archive files, `Changelog.md`, `Backend-Changelog.md`, this log.
Changes Made:

| Item | Result | Test or check |
|---|---|---|
| D1 | Large write-off rule, ADR-061. `largeWriteOffPercent` is 25. The data layer now refuses the Admin. No settings screen exists, so the setting changes in the data only. | `StockActions.test.tsx`; 2 older tests gained a note, as emptying an item now needs one |
| D2 | 19 days of 2027 added from Proclamation No. 1427, s. 2026, signed September 8, 2026, read on Lawphil. No Eid dates: they are proclaimed separately, add them then. Lawphil's Section 1 shows no heading before Chinese New Year, Black Saturday, All Souls' Day and Christmas Eve; its recitals, PIA and the SCCP memo call them non-working, so they are stored as special non-working. | `holidays.test.ts`, `VisitCalendar.holidays.test.tsx` |
| D3 | 6% logo and a boxed DRAFT notice on the on-screen draft only. A final letter has neither; a draft never prints (ADR-038). Worst-case contrast of `#616161` over `#F0F0F0` is 5.4:1, computed. | `ExcuseLetterPage.test.tsx` |
| D4 | Focus moves to Complaint after the patient is picked. The form already filled the time, the nurse and the disposition. Figures below. | Script in Chrome, `node visit2.mjs` in the scratch folder |
| D5 | A4 Visit Details printout, Staff only. | `print-documents.test.tsx` |
| D6 | Import Student List at `/students/import`: file, column mapping, preview, review, apply. `Sex` must be mapped, because a new record needs it; the prompt did not list it. "Bad LRN checksum" became "not 12 digits": an LRN has no check digit in this system. No real data used. | `StudentImportPage.test.tsx`, fixture `test/fixtures/student-list-sample.csv` |
| D7 | Inventory Usage History at `/inventory/history`, Staff only (ADR-038 gives the Admin no Inventory). | `InventoryHistoryPage.test.tsx` |
| D8 | `App.tsx` uses a data router; `useBlocker` covers browser Back, links and Alt shortcuts, and Visit Details' in-page Cancel asks. Back behaviour held. `allowLeave` skips the prompt after a save. A test caught the Incomplete Records return path needing it. | `useCancelNavigation.test.tsx` |
| D9 | Patient filter on the Dashboard's due follow-ups. No Staff Profile printout, as decided. | `DashboardAndReports.test.tsx` |
| D10 | The printout already had section, sex and birthdate; the age was added. The record has a `sex` field, so no blank line was needed. | `print-documents.test.tsx` |
| D11 | Nothing needed fixing. Figures below. | `src/test/stress.test.tsx` |
| D12 | Q2, Q7 and Q7b fixed in Part 1. **Q10** (`verifyLatestBackup` verifies a failed run) and **Q11** (unique item names) still differ in the mock; the prompt names only A1 to A4 as fixes, so they are left for the backend, which has the rule. | Read of the contract's table |

D4, typical visit, from opening New Visit to Save, by full LRN or Staff No.:

| Case | Clicks before | Clicks after | Keys before | Keys after |
|---|---|---|---|---|
| Student, common complaint | 3 | 1 | 13 | 16 |
| Student, medicine given | 5 | 3 | 16 | 19 |
| Staff patient | 3 | 1 | 9 | 12 |

The "after" path is by keyboard: two clicks become three keys. Script time was about 2.2 s both ways and includes fixed waits, so it is not a human time. The paper form was not measured. For the team: time a paper entry at the clinic and compare with the figures here.

D11, 1,000 extra students and 6,000 extra visits, in jsdom: search 1 ms, monthly report 4 ms, Student List first render 64 ms, typing 15 ms, Visit Log 37 ms, Dashboard 47 ms. The last two are time to the page heading, so they may not include all of the data. This is not a real browser on the clinic's 4 GB computer.

Reason: finish the frontend's open items before the backend integration.
Testing Performed: Baseline typecheck 0, lint 0, 890 of 890. After: typecheck 0, lint 0, 927 of 927.
Known Issues: Q10 and Q11 above. The canonical documents do not yet carry ADR-061 or the new screens.
Next Steps: Part 3, then `Prompt-Frontend-Cleanup-Issues-And-Docs-Nov1`.

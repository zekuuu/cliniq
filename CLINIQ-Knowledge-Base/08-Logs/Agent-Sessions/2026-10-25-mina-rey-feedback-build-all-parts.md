Date/Day/Time: Sunday, October 25, 2026 — 21:58 PHT (system clock; work began about 21:00)
Agent: Claude Code (Claude Opus 5.5)
Task: Build all five parts of `Prompt-Build-Professor-Feedback-Mina-Rey-Oct25.md` in sequence (Admin read-only and no printing; a calmer Dashboard; form and data fixes; inventory tag and rows per page; draft letters don't print)
Status: Completed (one open default to confirm; see Known Issues)
Prompt/Request: Zean pasted the five-part build prompt with "This run: Part ___" left blank. Asked which part to run, Zean answered: "In sequence, build all now". Defaults D1–D14 of the prompt were used unchanged; D7 was read as "the female/male pair counts as one of the four hues".

Files Modified:
- Data layer: `types/entities.ts`, `types/dashboard.ts`, `lib/mock-db/{api,dashboard,integrity,session,store,types}.ts`, `lib/mock-db/mock-db.json`, `lib/mock-db/README.md`
- Shared: `components/print/Print.tsx` (new `PrintButton`, `ADMIN_PRINT_NOTE`), `components/index.ts`, `components/ui/Pagination.tsx`, `components/forms/InventoryItemPicker.tsx`, `hooks/usePrinting.ts`, `hooks/usePageSize.ts` (new), `hooks/useIdentifiedStudent.ts`, `layouts/{AppShell,navigation}.ts(x)`, `index.css`, `routes/AppRoutes.tsx`
- Screens: Student List, Student Profile, Edit Student, Incident Log, Incident Report, `FromVisit`, Dashboard (`DashboardPage`, `DashboardHeader`, `StatCardRow`, `AlertLists`, `DashboardPrint`, `ComplaintTrends`), Reports, Audit Log, New Visit, Visit Detail, Visit Log, `LogbookFields`, Excuse Letter, Inventory form, `StockModals`, inventory and visit `api/` modules
- Tests: new `features/admin-read-only.test.tsx`, `features/clinic-visits/AssistedByAndGuardian.test.tsx`, `features/inventory/BrandAndPaging.test.tsx`; updated AppRoutes, BackNavigation, AppShell, Dashboard (Page, Views, AndReports, Loading), ComplaintTrends, printSummary, dashboard, auditCoverage, print-documents, ExcuseLetterPage, LogbookFields, StudentFormPage, ReportsPage, ui-review-regressions; `test/setup.ts`
- Knowledge base: `Module-Overview.md`, `User-Roles-and-Permissions.md`, `Screen-Inventory.md`, `Design-System.md`, `Audit-Coverage.md`, `Skills-Setup.md`, `ERD.md`, `Data-Dictionary.md`, ADR-026, ADR-029, ADR-038, `Decisions-Summary.md`, canonical `CLINIQ_Modules_and_Features.md`, feature READMEs (dashboard, clinic-visits, components, mock-db), skills `cliniq-print-patterns` and `cliniq-pagination-patterns`, Changelog, Issues-and-TODOs, Issues-Done-Archive

Changes Made:

## Part 1 — Admin: read-only profiles and incidents, and no printing (ADR-038 items 1–5)
- Routes: the Admin can open `/students`, `/students/:id`, `/incidents`, `/incidents/report` and `/incidents/:id/report`. Every other student, visit, incident, inventory, follow-up and Sports Report route stays Staff only (tested route by route). The Admin sidebar gains a "Student Care" group with Students and Incidents (D4).
- Read only: no Add Student, Edit, Archive, excuse letters, New Incident, Complete Stage 2, Approve Report or "Open the visit" for the Admin. Visit rows on the profile were already text (D2). The Reports Incident register gives the Admin "Open report" on every row. On the Dashboard, the Students and Incidents cards and the Frequent-visitor rows link for the Admin.
- No printing (D3): a shared `PrintButton` is disabled for the Admin, with "Printing is done by the clinician." as its accessible description. It covers the Dashboard, Reports, Student Profile, Incident Report and Audit Log. `usePrinting` mounts no document and writes no print audit for the Admin. The shell blocks Ctrl+P / Cmd+P, and the browser's own Print prints only that note (`data-print-blocked` in `index.css`). The browser menu itself can't be blocked.
- Audit (D1): a new `view` action ("Viewed (Admin)") is written when the Admin opens a student profile or an incident report, once per record per sign-in session (`firstViewThisSession` in `session.ts`, cleared at Login and Log out). Staff views aren't logged. Audit Log rows for students and incidents now link for the Admin.
- Also fixed: the printed Student Health Record showed "Â·" instead of "·" in the emergency contacts (encoding slip).

## Part 2 — Dashboard and colors
- `config.showFrequentVisitors` (false by default) hides the Overview panel, the Clinic Overview Report section and the "and frequent visitors" words in the print scope (D5). The data, `frequentVisitorMap` and the two existing config values stay. It was never in the urgent count. Integrity accepts the boolean, and persisted state is migrated.
- "Visits and incidents by sex / grade level" is now one card with a Sex / Grade level `SegmentedControl`. Sex is the default (D6). Its title follows the choice ("Visits and incidents by sex"). The filter buttons (count and share) and the chart's `aria-label` stay as the text alternative. These cards never had a Chart/Table switch.
- Colors (D7): the grade-level Incidents series moved from `error` red to the neutral `text-secondary`. Trends now uses brand green, the neutral, warning, and the female/male pair. The brand greens already match the logo, so no token changed. The rule is in `Design-System.md`.

## Part 3 — Forms and data
- LRN locked on Edit Student (read-only, with "The LRN is the student's identifier and can't be changed."). `saveStudent` also refuses it (`LrnLockedError`).
- A name change shows a required "Reason for the name correction" field (at least 3 characters, D8). `saveStudent` refuses it without one (`NameCorrectionReasonError`). The audit summary reads "Updated name. Name corrected; reason: <reason>", without the old or new name.
- "Assisted by" is a free-text `Combobox` of active account names (D9, `fetchAssistedByNames`).
- New Visit prefills Parent or guardian with the primary emergency contact's name when the field is empty (D10). It never overwrites typed text. `useIdentifiedStudent.select` now returns the loaded student.
- Visit Details shows the visit's date with Time out (D11). The Visit Log and printouts don't show Time out.

## Part 4 — Inventory and lists
- Optional `brand` on inventory items (`generic`, `branded`, or `null` for Not specified; PROVISIONAL, D12). It's on the Add/Edit Item form, the Batches details and the Dispense picker, and isn't a list column. Seed items carry `"brand": null`, and persisted state is migrated. The audit names it "generic or branded".
- Rows per page 10 or 20 on the shared `Pagination` for the Visit Log, Incident Log and Audit Log (D13). The default is 10 (the current size). The choice lasts for the browser session (`hooks/usePageSize.ts`). A change returns to page 1.

## Part 5 — A draft excuse letter cannot be printed (ADR-038 item 6)
- A draft stays on screen; Print / Save as PDF is disabled with "Approve the letter to print it." (D14), no print document mounts, nothing is audited, and the browser's own Print prints only that line. The DRAFT banner and watermark path was removed. Approved letters print as before; superseded and void letters still print stamped.

Reason: Sir Mina's and Sir Rey's review and Zean's decisions (ADR-038, ADR-039); the 12 `FIX` entries under "Feedback from Sir Mina and Sir Rey".

Testing Performed:
- Baseline before any change (`main` at `215c04f`): typecheck passed; lint 1 error (`NewVisitEntryPage.tsx:271`, refs during render) and 2 warnings; tests 22 failed / 644 passed (666).
- After: typecheck passes; lint is unchanged (the same 1 error and 2 warnings); build passes. Tests: 18 failed / 685 passed (703). Five baseline failures now pass, because the `react-chartjs-2` test mocks lacked `Doughnut` (added in 6 files). The only failure not in the baseline is "adds, promotes, and removes repeatable emergency contacts", a 5-second timeout under full-suite load. It passes alone (StudentFormPage 15/15). No test was weakened. Tests that encoded the old rules were rewritten to the new ones: Admin redirected from Students, Admin printout, Admin with no links, DRAFT print, LRN correction, the "11:59 PM" time-out text, and the logbook counts with the prefill.
- Screenshots (Playwright with the cached Chromium; tool and images kept in the session scratchpad, outside the repo): 20 screens × 1440/768/390 px for each role that can reach them, plus before/after of Overview and Trends at 1440 (`p2-before-*`, `p2-after-*`). The script checked every capture for horizontal scroll (none) and page errors (none), and ran axe-core 4.10.3 WCAG 2 A/AA (0 violations on all 60). Screenshots opened and looked at: Admin profile 1440/390, Admin incident report 1440, Admin dashboard 1440, Staff trends 1440, Staff trends grade 390, before/after Overview and Trends, Edit Student name 768, New Visit with Assisted by 1440, Visit Details time out 1440, Edit Item 390, Visit Log paging 390, draft letter 390 (before and after the badge fix). The rest passed the automated checks only.
- Fixed from the screenshots: the Excuse Letter header stretched the Draft badge beside the Print note (`items-start`).

Known Issues:
- D1 (audit of the Admin's views) is built as the default; Zean has not confirmed it (ADR-038 item 4).
- The browser's own Print menu can't be blocked in a web app; for the Admin and for a draft letter it prints only a one-line note.
- Full-page screenshots taken after scrolling show the sticky shell mid-page (known capture artifact, see the `VERIFY` "Dashboard Alerts row blank middle card").

Next Steps:
- Zean: confirm D1, and review the Admin flows on the real clinic computer.
- When the nurse sets the frequent-visitor number, set `config.showFrequentVisitors` to true.
- Backend: add `brand` and the `view`/`print` actions to the migrations once the ERD is approved.

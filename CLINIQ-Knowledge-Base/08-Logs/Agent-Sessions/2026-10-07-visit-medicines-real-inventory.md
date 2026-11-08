Date/Day/Time: Wednesday, October 07, 2026 — 10:45 PHT (work started about 09:55; ADR and docs stamped 10:43)
Agent: Claude Code (Opus 5.5)
Task: Make a visit's treatment record real inventory (Parts 1–5), with stock-integrity rules, Adjust Stock, Restock, and Incident Stage 2 medicines
Status: Completed

Prompt/Request: "Make the visit's treatment record real inventory. Today a visit's treatment is a plain text string and never touches stock. Saving a visit with medicines or supplies must decrement inventory and show on the student's record." Already decided by the project owner: keep the text box relabelled "Treatment notes"; add "Medicines & supplies given" as repeatable lines; expired items visible but disabled with an "Expired" badge and rejected by the data layer; nearing-expiry addable with a warning; no-expiry always addable; over-stock warns but is allowed. Part 1: line items with a searchable grouped picker, quantity stepper, read-only unit, optional instructions (~120 chars), remove; duplicate pick adds to the line; allergies shown for awareness; keyboard usable; follow dropdown-patterns and create a component skill. Part 2: one atomic write per save, name/unit snapshots, edits via "visit edited" adjustment transactions (never rewriting), expired rule only for added/increased quantity, say whether visits can be deleted, add an `adjustment` transaction type as provisional fields listed in Issues. Part 3: Adjust Stock modal (change or set to counted, required reason incl. Other + note, optional note, never below 0), expiry only through Restock with helper text. Part 4: show medicines on visit detail and student visit history; Student Number in any dispense history; standalone Dispense must pick a student or general use with a same-day-visit notice; seed lines and extend the integrity test. Part 5 (after 1–4 verified): Incident Stage 2 gets the same component; Stage 1 stays fast; incident dispenses reference the incident. Update Module-Overview Modules 3 and 8, Screen-Inventory, a new ADR, Skills-Setup; don't touch the ERD; tests; live Playwright verification; typecheck, tests, build; log.

Clarifications asked and answered during the session:
- No Restock UI existed and Edit Item overwrote stock and expiry directly → **Add a Restock row action and make stock/expiry read-only on Edit Item** (chosen option).
- Treatment box was required → **A visit needs treatment notes or at least one medicine/supply line** (chosen option).

Files Modified:
- Data layer: `frontend/src/types/entities.ts` (`ItemGivenLine`, `Visit.itemsGiven`, `Incident.itemsGiven`), `frontend/src/lib/mock-db/{types,store,api,selectors,integrity,index}.ts`, `mock-db.json`
- Shared UI: new `frontend/src/components/forms/{InventoryItemPicker,ItemsGivenField}.tsx`, new `frontend/src/lib/itemsGiven.ts`, `components/index.ts`, `components/icons/Icon.tsx` (`plus`), `components/ui/{Select.tsx,dropdownClassName.ts}` (panel placement moved to `placeDropdownPanel`, shared by Select and the picker)
- Screens: `features/clinic-visits/{NewVisitEntryPage,VisitDetailPage}.tsx` + `api/{newVisitApi,visitDetailApi}.ts`; `features/inventory/{InventoryListPage,InventoryFormPage,InventoryDispensePage}.tsx`, new `StockModals.tsx`, `api/inventoryApi.ts`; `features/emergency-response/IncidentEntryPage.tsx` + `api/incidentEntryApi.ts`; `features/student-records/StudentProfilePage.tsx`; `features/qr-digital-health-id/mobile/QrMobileHubPage.tsx`
- Tests: new `lib/mock-db/stock.test.ts`, `features/clinic-visits/ItemsGiven.test.tsx`, `features/inventory/StockActions.test.tsx`; updated `integrity.test.ts`, `dashboard.test.ts`, `NewVisitEntryPage.test.tsx`, `VisitDetailPage.test.tsx`
- Skill: new `.claude/skills/cliniq-item-picker-patterns/SKILL.md`
- Docs: new `06-Decisions/ADR-018-Stock-Integrity-For-Items-Given.md`; `Decisions-Summary.md`, `01-Requirements/Features/Module-Overview.md` (Modules 3 and 8), `03-Design/Screen-Inventory.md` (#11, #12, #28–#30), `04-Development/Skills-Setup.md`, `08-Logs/Frontend-Issues-and-TODOs.md`, `08-Logs/Frontend-Changelog.md`

Changes Made:
- **Atomic writes:** every mock-layer `write()` now snapshots the store and restores it if the mutation throws, so a rejected line leaves no visit, transaction, stock change, or audit entry behind.
- **Lines:** `recordVisit` dispenses each line (one `dispense` transaction + audit per line, linked by Student Number and visit). `updateVisit` diffs old vs new lines and writes `adjustment` transactions with reason `visit_edited` (+ returns stock, − takes more), audited "Visit edited"; the visit's own audit summary reads "Updated medicines and supplies". Lines snapshot item name and unit. Validation: whole quantity ≥ 1, known item, no duplicate item, instructions ≤ 120, expired only for added/increased quantity, notes-or-line.
- **Stock rules:** `dispenseInventoryItem` rejects expired items, bad quantities, and unknown Student Numbers/visits. New `adjustInventoryStock` (change or counted quantity, Staff reasons, note required for Other, never below 0). `restockInventoryItem` validates the quantity. `saveInventoryItem` keeps an existing item's stock and expiry.
- **UI:** "Treatment notes" + "Medicines & supplies given" on New Visit and Visit Detail (view shows the formatted lines). Inventory List gains Restock and Adjust Stock modals; Edit Item shows stock/expiry read-only. Dispense requires "A student" or "Not for a student (general use)", shows a same-day-visit notice with a link, and uses the picker. Student Profile and QR mobile history show "Given: …". Incident Stage 2 records lines (read-only once complete); Stage 1 has no medicine entry.
- **Seed/integrity:** every visit and incident has `itemsGiven`; five visits and two incidents carry lines backed by transactions (including a `visit_edited` adjustment and a miscount adjustment). The integrity check now validates lines, adjustment reasons/notes, transaction id format, student↔visit/incident matching, line quantity = dispensed − returned, Stage 1 has no lines, and seed stock ≥ 0.
- **Visits can't be deleted or voided** anywhere (edit only), so there is no remove-all-lines path; recorded in ADR-018 and Issues.

Reason: The project owner's request above; decisions recorded in ADR-018.

Testing Performed:
- `npx tsc -b` clean; `npx vitest run`: 54 files, 274 tests passed; `npm run build` passed; ESLint on every touched file: no errors (one pre-existing warning in `FollowUpPrompt.tsx`).
- New tests cover: atomic save and rollback (expired, unknown, quantity 0/1.5, duplicate, long instructions), expired rejected in UI (click and keyboard) and data layer, over-stock warning, edits adjusting stock both ways without rewriting past transactions, expired rule only on increases, Adjust Stock reason/note required and never below 0, disposal then restock, snapshots surviving a rename, Edit Item lock, Dispense general use, same-day notice (Student Number only, no name), Incident Stage 2 dispensing with `incidentId` and rejecting later changes.
- Live (Playwright 1.57 driving the Vite dev server with the cached Chromium; the Playwright MCP server wasn't connected in this session, so a local Playwright script was used instead): recorded a visit with Paracetamol ×2 and Gauze ×1 → stock 12→10 and 40→39; Student Profile showed "Given: Paracetamol 500mg × 2 tablets (1 tablet every 6 hours); Gauze Pads × 1 pieces"; ORS (expired) showed `aria-disabled` + Expired badge and a forced click added nothing; edited Paracetamol 2→1 → stock 10→11; Adjust Stock "Expired - disposed" set ORS to 0; Stage 1 showed no picker; Stage 2 Instant Cold Packs ×1 → 18→17. No console errors. Inventory list checked at 1280px and 390px (no horizontal page overflow); Actions/Status column widths set after the first screenshot showed stacked buttons.

Known Issues:
- Editing an incident's medicines after Stage 2 is complete is rejected pending a product decision (Frontend-Issues-and-TODOs).
- No inventory usage-history screen exists yet; when built it must show Student Numbers only.
- The changed screens need a Frontend-Loop-Engineering Phase 2 re-audit; their checkboxes were not changed.
- The Modules & Features canonical doc needs the ADR-018 rules.

Next Steps:
- Decide the incident-edit rule for medicines; review the provisional fields during ERD design; run the Phase 2 re-audit on the six changed screens.

Date/Day/Time: Monday, October 12, 2026 — 01:34 PHT (system clock; work ran 01:24–01:34 PHT)
Agent: Claude Code (Claude Opus 5.5)
Task: Student search from the first character, a "student name" placeholder, and the same search-and-pick field on every student field
Status: Completed
Prompt/Request: Zean: "All the student number fields like in QR screen should follow the same Enter student number or student name then will appear a item picker. Same as in New Visit input field. But before that I would like to revise the function. I want it to appear when started to type not just like type 2 letters or what. Also change the placeholder to Student name not just "name""

Files Modified:
- `frontend/src/lib/studentNumber.ts` (`STUDENT_SEARCH_MIN_LENGTH` 2 → 1)
- `frontend/src/components/forms/StudentPicker.tsx`; `frontend/src/components/index.ts`; `frontend/src/components/forms/StudentNumberField.tsx` (deleted)
- `frontend/src/hooks/useIdentifiedStudent.ts`
- `frontend/src/features/clinic-visits/NewVisitEntryPage.tsx`, `PeSportsReferralPage.tsx`, `api/peReferralApi.ts`
- `frontend/src/features/emergency-response/IncidentEntryPage.tsx`, `api/incidentEntryApi.ts`
- `frontend/src/features/inventory/InventoryDispensePage.tsx`, `api/inventoryApi.ts`
- `frontend/src/features/qr-digital-health-id/shared/QrScannerView.tsx`, `mobile/QrMobileHubPage.tsx`, `desktop/QrDesktopHubPage.tsx`, `api/qrLookupApi.ts`
- Tests: `lib/mock-db/search.test.ts`, `NewVisitEntryPage.test.tsx`, `PeSportsReferralPage.test.tsx`, `IncidentEntryPage.test.tsx`, `StockActions.test.tsx`, `QrMobileHubPage.test.tsx`, `ui-review-regressions.test.tsx`
- `.claude/skills/cliniq-combobox-patterns/SKILL.md`
- `CLINIQ-Knowledge-Base/01-Requirements/Features/Module-Overview.md`, `09-References/Canonical-Documents/CLINIQ_Modules_and_Features.md`, `04-Development/Skills-Setup.md`, `08-Logs/Issues-and-TODOs.md`, `08-Logs/Changelog.md`, this file

Changes Made:
- Search starts at the first character: `STUDENT_SEARCH_MIN_LENGTH` is 1, used by both the picker and the data-layer selector. An empty or whitespace-only field still lists nothing, and results stay capped at 8 active students.
- Placeholder "YYYY-NNNNN or name" → "YYYY-NNNNN or student name". Default hint "Type a Student Number or at least 2 letters of the name, then pick the student." → "Type a Student Number or the student name, then pick the student."
- `StudentPicker` now takes optional `selected` and `onClear`. When both are given, it shows the picked student (name · number · grade) with a Change button, which clears the pick and brings the search back focused. This block existed only on New Visit; New Visit now uses the prop, and its local focus state is gone. It also takes `required` (default true).
- Rollout: Incident Stage 1, PE/Sports Referral, and Dispense replace `StudentNumberField` with `StudentPicker` (Staff get the "Add a student" link on no match). The QR hubs' manual fallback (mobile Staff/Instructor and desktop) replaces the typed number and "Look Up Student" button with an optional picker labelled "Enter Student Number or student name (optional)"; picking runs the lookup at once (audited `scan`, as before). Each feature has its own search function in its `api/` module (ADR-013): `searchIncidentStudents`, `searchReferralStudents`, `searchDispenseStudents`, `searchQrStudents`. QR card descriptions now say "search by Student Number or student name".
- `StudentNumberField` had no users left and was deleted. `useIdentifiedStudent` lost its typed-number state (`input`, `setInput`, `needsStudentNumber`); `validate` now asks for a pick ("Choose the student: type a Student Number or name, then pick from the list."). `resolve` returns the picked or preselected student.
- Skill `cliniq-combobox-patterns`, old → new: "Nothing is listed under 2 characters or on empty focus" → "Results appear from the first character typed; nothing is listed on an empty field or on focus", plus the placeholder text. "Used on New Visit. It would also fit Dispense, PE/Sports Referral, and Incident Stage 1, which still use `StudentNumberField`." → every student field uses it (list), QR is optional and picks run the lookup, and the picked-student box comes from `selected`/`onClear`. `Skills-Setup.md`'s combobox row got a dated update note.
- Requirements: Module 3 "Add new visit entry" "(2+ characters, …)" → "(results appear from the first character typed, …)", plus a sentence naming the other forms. Module 6 QR "enter Student Number manually (as a fallback)" → "search by Student Number or student name (pick from the list)" for Staff and Instructor. Applied identically to `Module-Overview.md` and the canonical Modules & Features, since Zean requested the change and those lines were already verbatim copies.

Reason: Zean's request. The 2-character minimum and the typed-number fields came from the earlier StudentPicker build (skill rule, no ADR).

Testing Performed:
- `npm run typecheck`: pass. `npm run lint`: 0 errors, 2 pre-existing warnings. `vitest run`: 65 files, 373/373 (was 372; +1 Dispense name-search test).
- Seven tests encoded the old behavior and were updated to the new rule, without weakening them. Search: empty → none, one letter → 1–8. New Visit: nothing on focus, list after one letter, placeholder text. Incident Stage 1 and PE: the pick is required, an unknown number says "No active student matches", and a number + Enter or a click picks. Dispense: the today's-visit notice still names no student, and the picked box shows the name. QR: the field is optional, and picking looks up. The QR "Student not found" regression now removes the student between search and pick, the only way the picker can reach a not-found lookup, and still proves a camera scan clears the message.
- Live (Playwright/Chromium, scratchpad only): Staff QR at 390, Instructor QR at 375, and Incident Stage 1 at 1280. In each, the placeholder is "YYYY-NNNNN or student name", 1 letter lists 8 options, there is no page overflow and no console errors, and the pick works (QR result cards, Incident Change box).
- `prettier --check --end-of-line auto`: `useIdentifiedStudent.ts` formatted. `StudentPicker.tsx` and `search.test.ts` were already unformatted at HEAD and left that way.

Known Issues:
- New `DECIDE`: PE/Sports Instructors can now search by name on the QR lookup. Confirm, or keep the Instructor hub number-only.
- `NOTE`: Dispense shows the picked student's name (single lookup); the notice and any future history list stay Student-Number-only.
- Existing `DECIDE` "Typing a full Student Number and clicking Save without picking" now applies to every form that uses the picker.

Next Steps:
- Zean to decide the Instructor name-search question.
- The screens are already in open AUDIT entries (New Visit, Incident Stage 1, PE/Sports Referral, Dispense, QR hubs); re-audit in Phase 2.
- Nothing committed or staged. The earlier fix sweep was committed by Zean as `26e94bf`; this change sits uncommitted on top of it on `fix/issues-todos-sweep`.

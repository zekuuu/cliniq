Date/Day/Time: Sunday, November 22, 2026 — 01:32 PHT
Agent: Claude Code (Opus 5.5)
Task: A typing pause before every search field searches
Status: Completed
Prompt/Request: "for all the search fields, add a buffer delay before it actually searches, so it doesn't search immediately while still typing."
Files Modified:
- frontend/src/hooks/useDebouncedValue.ts (new)
- frontend/src/hooks/useDebouncedValue.test.ts (new)
- frontend/src/components/forms/StudentPicker.tsx
- frontend/src/components/forms/PatientPicker.tsx
- frontend/src/components/forms/InventoryItemPicker.tsx
- frontend/src/test/setup.ts
- .claude/skills/cliniq-combobox-patterns/SKILL.md
- .claude/skills/cliniq-item-picker-patterns/SKILL.md
Changes Made:
- Checked first: every list search box (`Input type="search"`) already waited 250ms after typing stopped (Zean, November 4, 2026), and `usePagedList` waits again before asking the server (ADR-082). Those were not changed.
- The fields that still searched on every key were the three type-ahead pickers: `StudentPicker` and `PatientPicker` asked the server on every key, and `InventoryItemPicker` re-filtered on every key.
- New hook `useDebouncedValue(value, delay = SEARCH_DEBOUNCE_MS)` (250ms, the same constant as the lists). The two patient pickers search with the settled text; while it differs from what is typed they show the loading line and list nothing, so Enter never picks a stale result. The item picker filters with the settled text and lists nothing while typing (no "No items match" flash), so Up/Down and Enter never act on a stale list.
- Test setup replaces the hook with a pass-through so the existing picker tests can pick right after typing; `useDebouncedValue.test.ts` checks the real pause with fake timers.
- Skills: `cliniq-combobox-patterns` (old: results from the first character typed; new: from the first character, once typing pauses for 250ms) and `cliniq-item-picker-patterns` (old: filters on every key; new: filters once typing pauses).
Reason: Zean's request; also saves one server request per key in the patient pickers.
Testing Performed: `tsc -b` clean; ESLint clean on the changed files; full Vitest run with 4 workers 1280 of 1282 pass. The 2 failures are 5 s timeouts in `FollowUpListPage.test.tsx`, whose page is in another session's uncommitted change (undo on action toasts); none of the files in this change is involved. All clinic-visit tests (139) pass.
Known Issues: none from this change.
Next Steps: Zean asked about a search field in the top bar; see the issues file / answer in chat. Not committed.

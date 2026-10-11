Date/Day/Time: Sunday, October 11, 2026 — 12:11 PHT (system clock)
Agent: Claude Code (Claude Opus 5.5)
Task: Status audit of open items in `Issues-and-TODOs.md`, and a check of the standing format rules
Status: Completed
Prompt/Request: "Follow-up prompt — Status audit and standing rules for `Issues-and-TODOs.md`." Zean reported that some items still marked open (`- [ ]`) were already done. The request was to find them and close them with evidence: change `- [ ]` to `- [x]`, set the tag to `DONE`, and append `Resolved — verified <real timestamp>: <evidence>`. Only clear evidence closes an item. Partial or branch-only evidence goes in the report. Already-`DONE` items must never be reopened; any that look wrong are reported instead. The request also asked to confirm the "Format for new entries" rules and the `CLAUDE.md`/`AGENTS.md` step-4 sentence, adding only what was missing, and to recompute the "Open work at a glance" block with a script and run five scripted checks. Constraints: no code or issue fixes, no rewording or moving bullets, no groupmate-review bugs, no changes to `Frontend-Loop-Engineering.md` or `.claude/skills/`, no commit or push, no Microsoft Edge.

Files Modified:
- `CLINIQ-Knowledge-Base/08-Logs/Issues-and-TODOs.md`
- `CLINIQ-Knowledge-Base/08-Logs/Changelog.md`
- `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-10-11-issues-todos-status-audit.md` (this file)

Changes Made:
- Ran `git fetch --all`. `origin/feature/clinic-overview-dashboard` has no commits that are missing from `main`, so no fix is branch-only. The edit started from the working-tree file, which includes the uncommitted restructure from `2026-10-11-issues-todos-tagged-checklist.md`.
- Closed 13 open items with evidence, listed below.
- Recomputed "Open work at a glance" with a script. The open FIX list dropped from 22 to 12.
- Part 2: no changes were needed. "Format for new entries" already has the date/context rule plus the Adding, Resolving, and Always rules. The step-4 sentence is already in both `CLAUDE.md` and `AGENTS.md`, from the previous session.

Closed items and evidence:
1. FIX **Auto-insert the Student Number dash.** Evidence: Changelog row of Sep 30 17:29 and `2026-09-30-f2-completion.md`.
2. FIX **Prevent the masterlist table layout from shifting…** Evidence: the same row ("Student List profile navigation/stable layout").
3. FIX **Add a "View profile" action to Student List rows.** Evidence: the same row and log.
4. FIX **Add parent contact information near Parent Notification Log.** Evidence: the same row and log.
5. FIX **Make dashboard alerts redirect to their respective module pages.** Evidence: Changelog row of Oct 1 23:31:15, `2026-10-01-dashboard-visible-affordances.md`, and `AlertLists.tsx:87/123/166`.
6. FIX **Inconsistent — Desktop QR Scan/Lookup (#23)… idle skeleton.** Evidence: Changelog row of Oct 1 00:07 and `2026-10-01-resolve-unresolved-issues.md`. The regression test passes.
7. FIX **Desktop QR Scan/Lookup idle skeleton** (duplicate entry). Evidence: the same as item 6.
8. FIX **Add/Edit Student's duplicate-record dialog is hand-built.** Evidence: the Oct 1 00:07 row and log ("shared duplicate-record Modal").
9. FIX **Cosmetic — top bar at 390px.** Evidence: the Oct 1 00:07 row and log ("non-overflowing compact header").
10. FIX **Cosmetic — long option labels at 390px.** Evidence: the Oct 1 00:07 row and log ("concise Dispense labels").
11. DECIDE **Follow-Up "Completed" has no confirmation.** Evidence: the decision is recorded in the canonical Frontend Context Brief (18c) and `Design-System.md:105`.
12. DECIDE **Dropdowns and text inputs now differ more visibly inside forms.** Evidence: `Design-System.md:29`, canonical brief line 153, and `Input.tsx:48`.
13. DECIDE **Filter rows pair a 32px search `Input` with a 40px dropdown.** Evidence: `Design-System.md:29` sets 40px, and `Input.tsx:48` has one height with no size variant.

Possibly done — needs Zean's check (left open):
- **Provide a working Cancel action on every relevant form.** The F2 completion log covers only the Visit and Incident Cancel actions. The item asks for an audit of every entry form.
- **Cosmetic — Dashboard at 390px, Staff (`scrollable-region-focusable`).** The Oct 1 00:07 log made all DataTable scrollers keyboard-focusable, but the item does not say which region axe flagged.
- **No navigation below `lg`** (two entries), **The Dashboard header is uncarded**, and **The Incident Archive sorts oldest-first.** The Oct 1 00:07 session built these, and its regression tests pass. However, no ADR or canonical document records the decision.

Possibly wrongly closed (not reopened):
- DONE **Small text for a low-vision audience** (Sep 30 22:55, "brand subtitle… 12px; no rendered text is below 12px"). `2026-10-01-sidebar-academy-label-sizing.md` later reduced the academy line to 11px. `Sidebar.tsx:29`, `:199`, and `:225` use `text-[11px]`. This matches the open FIX "`BrandLogo` academy subtitle is 11px".
- DONE **Dashboard Chart control covered while scrolling** (Oct 3 03:07, sticky Visits Trend header). The Changelog row of Oct 8 21:37 later removed that sticky header on purpose. This is superseded, not a regression.

Reason: Some open items had already been resolved, so the open list overstated the remaining work.

Testing Performed:
- `npm run lint` still fails with 1 error (`react-hooks/set-state-in-effect`, `ReportIssueModal.tsx`), so that FIX stays open.
- `npx vitest run src/features/ui-review-regressions.test.tsx src/features/emergency-response/ParentNotificationPage.test.tsx src/features/student-records src/features/qr-digital-health-id`: 12 files and 43 tests pass.
- Scripted checks (`check2.py`, before = working-tree file at the start of this task):
```
(content diff empty)
[PASS] 1 content (body diff lines 0; title and legend unchanged)
[PASS] 2 open->done only (changed 13, non open->done 0, DONE reopened 0, note tags changed 0)
[PASS] 3 evidence (closures 13, with "Resolved — verified" evidence 13, reported 13)
[PASS] 4 index (fresh {'FIX': 12, 'DECIDE': 33, 'DONE': 88, 'LATER': 6, 'VERIFY': 2, 'NOTE': 13, 'DOC': 6, 'AUDIT': 5}; FIX list 12 vs body 12; closed items absent from open list True)
[PASS] 5 markdown (bad checkbox lines 0)
ALL PASS
```
- AUDIT items: `Frontend-Loop-Engineering.md` has no audit notes dated October 7–11, so all five stay open.
- DOC items: the canonical Modules & Features, Frontend Context Brief, and Design Reference do not contain the requested wording, so all six stay open.

Known Issues: None of the items under "Possibly done" or "Possibly wrongly closed" were changed. Zean decides on them.

Next Steps: Zean reviews the "Possibly done" and "Possibly wrongly closed" lists. The groupmate-review bugs are a separate task.

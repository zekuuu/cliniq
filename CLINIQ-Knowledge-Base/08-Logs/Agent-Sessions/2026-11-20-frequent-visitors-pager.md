Date/Day/Time: Friday, November 20, 2026 — 01:07 PHT (clock read with PowerShell `Get-Date`)
Agent: Claude Code (Opus 5.5)
Task: Page the Overview's Frequent-visitor warnings when "Show all" is open
Status: Completed

## Prompt/Request

Zean: "Frequent-visitor warnings Count:300 floods, maybe add pagination or what"

## Files Modified

- `frontend/src/components/ui/ListCard.tsx`: an optional `footer`, shown below the rows and outside the scroll region, only when the list has rows.
- `frontend/src/features/dashboard/components/AlertLists.tsx`: `FrequentVisitorsAlert` pages its "Show all" view.
- `frontend/src/features/dashboard/DashboardPage.test.tsx`: the Show all test expects 10 rows and the pager's total.

## Changes Made

**Follow-up, same session (Zean: "and maybe remove SHow all now, and just default to pagination if there's data"):** the "Show all" / "Show top 5" button is gone. The panel always pages, opening at 10 rows, and the pager shows whenever there is at least one row. `DashboardPage` keys the panel by its date range, so a new range starts on page 1. The two bullets below that mention the top 5 describe the first step only.

- The panel still opens with the top 5 and a "Show all N" button (October 25, 2026). The count badge still shows the total.
- "Show all" now shows the shared `Pagination` under the list. It opens at 10 rows per page (10, 20, 50 or 100; `usePageSize`) and has the page field and the First, Previous, Next and Last buttons (`cliniq-pagination-patterns`).
- The pager sits inside the card's 20 px side padding with 16 px below it, in line with the rows (Zean's screenshot: it touched the card's edges).
- Opening or closing "Show all" and changing the page size return to page 1.
- Print is unchanged, because `Pagination` is `print:hidden`. A print of the open panel prints the current page only, like the top 5 before.

## Reason

At 300 students, "Show all" put 300 rows in one card.

## Testing Performed

- `tsc -b` clean; ESLint and Prettier clean on the 3 files.
- `vitest run src/features/dashboard src/components/ui`: 118 of 118 pass.
- No browser check.

## Known Issues

None.

## Next Steps

Zean reviews and commits.

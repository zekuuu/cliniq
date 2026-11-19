# ADR-082: The long lists are paged by the server, one page at a time, through TanStack Query

**Date:** Thursday, November 19, 2026 — 12:18 PHT
**Status:** Accepted (Zean, in the run's pop-ups of Thursday, November 19, 2026, answering `Prompt-Performance` Steps 1 and 2: measure on `cliniq_testing` rebuilt with five years and 100,000 audit entries; page, search and sort in the address but not the page size; TanStack Query; only the large lists; keep the audit log's exact total; all findings confirmed). It supersedes ADR-013 for the paged lists only. It keeps ADR-014, ADR-079 and ADR-080; the mock layer `frontend/src/lib/mock-db/` is not edited.

## Context
Every list screen fetched every row and paged it in the browser. The pager only cut what had already arrived. Measured on the five-year load-test school, Thursday, November 19, 2026, from 06:00 to 07:00 PHT (session log `2026-11-19-performance-server-paging.md`):

- The Visit Log's All range sent 23,482 visits (14.3 MB in 2.1 s). The Visit and Incident Logs also downloaded every student with the full LRN (203 KB), every staff patient and every user, to join them in the browser.
- The audit log read and shaped all of its 100,000 entries for any page: 9.5 s for page 1, 28 MB for the whole.
- The Student List made 23 requests on one load, 10 of them only to count the Archive button, so a fast walk through the screens hit the 120-requests-a-minute limit.
- The follow-up list asked the database 368 times for one answer. `archive/years` took 2.7 s, looking up the school year once per day.

ADR-013 chose a plain `useAsyncData` hook and said to revisit it "if the real API needs cache invalidation, pagination coordination, or optimistic updates".

## Decision
1. **One paged-list contract** (API-Contract.md, "Filtering and pagination"):
   - Requests take `page`, `perPage` (10, 20, 50 or 100; default 25, at most 100), `search`, `sort` (a key, `-` for descending) and the list's filters.
   - Answers are `data` with `meta: { page, perPage, total, lastPage }`. A page past the end is an empty page, not an error.
   - Without `page` or `perPage`, the whole list comes back as before. Printouts and exports read it on purpose, by an explicit call.
   - The existing camelCase `perPage` stays, so the contract has one spelling.
2. **Which lists (Zean: only the large ones):** the Visit Log (new `GET /api/visits/log`), the Incident Log (new `GET /api/incidents/log`), Follow-Ups, Inventory Usage History (stock movements), the Audit Log, the Student List and the Incomplete Records Queue. The small lists stay whole: staff (65), accounts (27), inventory items (60) and sports reports.
3. **Where the work is done.** Filters, search and sort run in SQL for the lists that grow with history. The Student List and the Incomplete Records Queue sort and cut in memory, bounded by the school roll. The searches see only what a list shows: typed digits find the last 4 of the masked LRN (ADR-080 item 7), and a hidden full LRN never matches.
4. **The client data layer (Zean: TanStack Query).** `@tanstack/react-query` (one runtime dependency) runs the paged lists through one hook, `usePagedList`:
   - **The address** holds the page, the search and the sort (`?page=`, `?q=`, `?sort=`). The page size starts at 10 and stays out of the address (Zean's November 17 rule).
   - **On screen** the last page stays visible while the next loads, never an empty table.
   - **Fetching:** the next page is fetched when the browser is idle; a request no longer wanted is cancelled; the search waits 250 ms after typing pauses.
   - **Resets:** a filter, search, sort or page-size change goes back to page 1, and a page emptied by a delete moves to the new last page.
   - **Retries:** a 429 or a dropped connection is retried twice, after 1 s then 2 s; nothing refetches when the window regains focus.
   - **Other screens:** `useAsyncData` is unchanged; they keep it.
5. **Mock mode keeps the same shape (ADR-080).** Each paged loader is routed by `routed()`. In mock mode it pages the mock's whole result in memory with the screens' own sort rule, so mock mode orders rows as before.
6. **Printing (Module 11, ADR-044).** The Audit Log's Print button still prints every matching entry: it loads the whole filtered list first. Ctrl+P on its own prints the page on screen, and the printout's scope line says so: "Page 1 of N only … Use the Print button for every entry."
7. **Waste removed with the paging:**
   - **Archive buttons:** the Student and Staff lists read only their Archive button's count, not the whole Archive.
   - **Backup indicator:** the sidebar and the Dashboard read `GET /api/backups/status?summary=1`.
   - **New Visit:** reads the visit complaint types once, not twice.
   - **Settings:** read once per HTTP request, not once per row.
   - **Follow-ups:** answered in one query.
   - **School years:** `archive/years` looks the school year up once per year, not once per day.
   - **Complaint lookup:** a visit's complaint spelling comes from two bounded lookups, not `SELECT DISTINCT complaint FROM visits`.
   - **Student rows:** health entries and contacts are grouped once by student, not filtered per student.

## Alternatives Considered
- **A small in-house cache in `useAsyncData`.** No new dependency, and ADR-013 would hold. Rejected by Zean's answer: cancellation, de-duplication, prefetch, retry and keep-previous would all be written and kept by hand.
- **Paging every list, the small ones included.** One contract everywhere. Rejected by Zean's answer: the small lists gain nothing measurable.
- **Previous and Next without a total on the audit log.** Not needed: `COUNT` over 100,000 entries takes 14 ms.
- **Keeping the page size in the address.** Rejected: Zean's November 17 rule keeps it out.
- **Loading the mock layer only in mock mode** (it ships about 312 KB of source in the API build). Not done: it needs `lib/mock-db/` edited, which ADR-080 point 6 forbids. Recorded as open in Frontend-Issues-and-TODOs.

## Consequences
- The frontend gains one runtime dependency, `@tanstack/react-query` 5.108.0 (+7.7 KB gzip on first load).
- Every paged loader has two sides to keep in step (mock and HTTP), as ADR-080 says for every connected function.
- On the API, the Visit and Incident Logs no longer download the student list, and the full LRN no longer reaches the browser on those screens.
- Ctrl+P alone on the Audit Log now prints one page and says so. The Print button prints everything, as before.
- The clinic PC must run `php artisan optimize` after each update (Environment-Setup.md, "Speed and reliability settings for the clinic PC"). Under parallel requests Apache's threaded PHP sometimes read no `.env`, and a cached configuration ends that.
- Canonical documents that describe the data layer as plain `fetch` with no library (Frontend Context Brief, Project Plan; see `09-References/Canonical-Documents.md`) need the same note: flagged, not edited in this run.

# November 25 performance check

Measured Wednesday, November 25, 2026 — 22:54 PHT, on Zean's development computer. This run answers the request that CLINIQ feels slow even after a database reset and checks growth through five school years. No application behavior or deployment configuration was changed.

## Method and limits

- Isolated local MariaDB database: `cliniq_check_perf_20261125`, created only after checking it did not exist. `backend/tools/load/build.php` rebuilt that scratch database at each size; its integrity and realism checks passed. No real database was used.
- PHP 8.5.6 CLI server on `localhost:8091`, development configuration, OPcache disabled for CLI, default 128 MB memory. `tools/load/bench.php journey` sent the same 42 endpoint actions three times per size, with its 520 ms pacing; values below are request p50, not full-screen load times. The journey saves three synthetic visits per size. At five years, the full audit response needed a separate one-run check with both PHP server and benchmark client at 512 MB.
- Browser: Chromium 159, isolated profile, network cache disabled, cold login navigation. Production Vite preview and Vite dev ran on the same computer. This is a comparison of delivery modes, not a test of the clinic Apache configuration or a diagnosis of Zean's particular slow screen. Three samples are too few for a stable p95.

| Data size | Students | Visits | Stock movements | Audit rows |
|---|---:|---:|---:|---:|
| Empty | 0 | 0 | 0 | 0 |
| Small generator run | 9 | 4 before journey | 62 | 180 |
| One school year | 918 | about 2,600 | 2,548 | 9,767 |
| Five school years | 1,258 (906 active) | 14,722 before journey | 13,782 | 100,000 |

The small generator run includes reference and demo extras, so it is not the proposed five-per-module Simulation seeder.

## API journey (milliseconds, p50 of three)

| Endpoint | Empty | Small | One year | Five years | Growth and limit |
|---|---:|---:|---:|---:|---|
| Auth `/api/auth/me` | 270 | 248 | 289 | 436 | Per-request cost exists with no records; five-year number also varies with server load. |
| Dashboard summary, this month | 363 | 271 | 477 | 710 | Grows with history, still below the proposed 1.5 s Dashboard budget at five years. |
| Student search, name | 263 | 255 | 363 | 470 | Reads/filter the active roster in PHP; roughly flat after the school reaches 900 active students. |
| Student list, page 1 of 10 | 277 | 269 | 396 | 394 | Stable between one and five years; about 1.8 KB returned. |
| Visit Log, page 1 of 10 | 277 | 268 | 306 | 348 | Near flat; about 3.6 KB returned at five years. |
| Visits, whole list | 384 | 264 | 457 | 1,337 | 1.87 MB at one year, 10.24 MB at five years; unsuitable for routine page loads. |
| Audit Log, page 1 of 25 | 305 | 298 | 303 | 578 | Exact count/date filtering costs more at 100,000 rows; still small response, 7.8 KB. |
| Audit Log, whole list | 296 | 282 | 521 | 1,555 (500) | 2.0 MB at one year; all three five-year requests exhausted the server's 128 MB limit. With 512 MB on both server and benchmark client, one request succeeded in 4,562 ms, 29.05 MB. Only the explicit full print/export path uses it. |
| Monthly report, last month | 332 | 359 | 505 | 677 | Increases, below the proposed 1.5 s report budget at five years. |
| Follow-ups, whole list | 269 | 263 | 374 | 354 | 482 KB at five years; the screen uses its paged route. |

Every listed endpoint except the full audit request at 128 MB returned successfully. The 512 MB audit check first failed in the benchmark client while decoding the 29 MB answer; giving the client 512 MB too confirmed the server response succeeds. The clinic setup guide already specifies 512 MB for PHP. The five-year full audit path is still large enough to stall printing or a browser.

## Browser and query findings

| Cold Login load | Production preview | Vite dev |
|---|---:|---:|
| First contentful paint | 272 ms | 2,412 ms |
| Largest contentful paint | 348 ms | 2,480 ms |
| Requests | 12 | 164 |
| Transferred bytes | 4.45 MB | 13.92 MB |

This signed-out screen needs no student data. In the production waterfall, the Healware logo is 1.95 MB, the backdrop 0.95 MB, and the MCA logo 0.58 MB (the cache-disabled run requested the MCA logo twice). The shared components chunk is about 200 KB transferred. Vite dev sends separate source and dependency modules, including 3.13 MB of React DOM and 0.67 MB of mock JSON. Browser readiness beyond paint was not separately measured.

`EXPLAIN` on five years: the Dashboard's unbounded counted-visits read scans about 14,683 rows (`ALL`); a visit page sorted by time scans and filesorts the same table; the audit first page uses `idx_audit_time` (`range`), while text search with `LOWER(summary) LIKE '%visit%'` inspects rows in that date range. Student name/LRN matching is performed on the active roster in PHP, not by a database name index. The November 19 performance session already records why the visit filesort and PHP roster filter were left alone at this scale.

## Actions supported by the measurements

| Cause | Proposed change | Expected gain | Risk / decision | Measured scale limit |
|---|---|---|---|---|
| Development delivery and uncached PHP are slow even on empty data. | For the clinic PC, use the existing production build, Apache, OPcache, and Laravel cache steps in `04-Development/Environment-Setup.md`; measure the user's actual screen before changing code. | The local cold Login production preview painted about 2.1 s sooner than Vite dev; clinic result remains unmeasured. | Production setup must use the documented environment; do not run `artisan optimize` on this development copy because its load-test database override would be ignored. | Present with zero records. |
| Login assets dominate transferred bytes. | Consider smaller or modern image assets after visual review. | Potentially several MB on a cold load; exact paint gain unmeasured. | Image quality and branding need review. | Present with zero records. |
| Dashboard reads all historical visits for a current-month view. | Restrict its database read to the requested and comparison windows while preserving chart, previous-period, and weekday rules. | Should remove most history reads for current-month views; no before/after measurement yet. | Requires parity tests for all range presets and roles before applying. | 710 ms at five years; under 1.5 s budget. |
| Whole-list print/export paths grow linearly. | Keep ordinary screens on existing paged endpoints; consider streamed or chunked audit printing if every-entry print remains required. | Avoid a 29 MB in-memory response on the full-audit path. | Changes print behavior and contract; needs a product decision. | Full audit fails at 100,000 rows with 128 MB; succeeds at 512 MB in 4.56 s. |
| Audit page exact total and search scan many rows. | Keep current index and paging; revisit count/search design if the screen itself exceeds its budget on the clinic PC. | Unknown without an Apache comparison. | Exact total was explicitly chosen in ADR-082; changing it needs approval. | 578 ms on this CLI server at 100,000 rows; earlier Apache check was faster. |

No performance code change was applied: Zean identified API mode on the development servers, and the measured cold Login difference points first to development delivery overhead. The already documented clinic PC build/Apache steps remain the immediate deployment checklist. Unmeasured here: Sports and inventory-sheet print duration, backup ZIP duration, registrar import alone, concurrent load, and a clinic Apache run.

## Authenticated API-mode Chromium route audit (Thursday, November 26, 2026)

Using the existing Playwright/Chromium installation (never Edge), the Vite dev server on `localhost:5175` and Laravel's PHP CLI server on `localhost:8091`, a paced SPA navigation loaded 45 Staff/Admin static route-role combinations with zero failed API responses. Median navigation to settled network was 622 ms. Three incident report/notification screens have no `h1` and each incurred a 2.2-second measurement timeout; their roughly 2.5-second recorded times are instrumentation artifacts and are excluded from cause ranking. Other examples: Admin Dashboard 1,995 ms/10 API responses; Staff Student List 1,428 ms/9; Staff New Visit 1,062 ms/11; Staff Audit Log 860 ms/2; Staff Backup 842 ms/4. Strict Mode and route components can issue repeated requests in dev; this run counted responses but did not reliably measure response bodies because the development server omitted `content-length`.

A second paced run loaded 12 record-detail route-role combinations and the Student Import route with zero failed API responses; median was 689 ms. Staff Student Profile 942 ms/8 API responses, Visit Details 1,017 ms/15, Incident Report 888 ms/14; Admin Student Profile 1,220 ms/14. The five-year load fixture had no Sports Reports, so a separate API-mode Chromium run against the five-record Simulation scratch database opened a Sports Report detail successfully. That run also saved and undid the new warning-period Settings, with values returning from 10/45 to 7/30. Its initial unauthenticated `/api/auth/me` returned the expected 401 before sign-in; no authenticated call failed. Browser audit scripts and raw JSON remain outside the repository under `%TEMP%/cliniq-playwright/`.

The Thursday, November 26, 2026 — 03:46 PHT production build passed. The largest JavaScript chunks were shared components 621.62 KB (200.59 KB gzip), the entry 288.72 KB (87.21 KB gzip), and tooltip code 181.41 KB (63.41 KB gzip); Vite flagged the shared components chunk over 500 KB. Route chunks were separate, including Dashboard 42.08 KB and Calendar 28.89 KB. This confirms route splitting exists, while shared components remain an optimization candidate after the clinic PC is measured.

## Implemented improvements (Thursday, November 26, 2026)

Zean approved the measured image, Dashboard-query and full Audit Log print improvements. The Login and shared branding now request optimized WebP assets and a small PNG favicon. A cache-disabled cold production-preview Login transferred **606 KB** in 12 requests, including **217 KB of images**, versus the earlier **4.45 MB** total. Three new Chromium first-contentful-paint samples were 516, 156 and 176 ms (median 176 ms); these short runs and changed browser state do not establish a reliable paint-time gain. The unchanged originals remain in `frontend/public/` for reference.

Dashboard summary now reads visits and incidents only from the selected period and the comparison windows; its all-time pending Stage 1 count remains separate. Calendar day queries use their requested range. A regression test covers old pending incidents and the previous-month weekday comparison.

API-mode Audit Log Print now opens Staff-only `GET /api/audit-log/print`, which streams the entire filtered A4 document in 1,000-row database chunks, records one print action and avoids the old 29 MB JSON transfer. Ctrl+P still prints only the visible screen page. The older JSON endpoint remains for compatibility, but the app no longer uses its `fullLrn=1` whole-list mode for printing.

| Data size | Dashboard summary, 3 direct requests (median) | Streamed Audit print, 3 direct requests (median) | Audit document size |
|---|---:|---:|---:|
| Empty | 96 ms | 88 ms | ~17 KB |
| Small Simulation | 124 ms | 110 ms | ~23 KB |
| One school year (2,686 visits; ~9,772 audit rows) | 137 ms | 438 ms | ~1.49 MB |
| Five school years (14,727 visits; ~100,027 audit rows) | 132 ms | 20.21 s | ~15.32 MB |

These after-change figures came from warmed, direct requests against isolated scratch databases on PHP CLI with a 128 MB limit. The earlier Dashboard figures above came from a paced 42-action journey, so the two sets are indicative rather than a controlled speedup claim. The five-year print stream succeeded on all three attempts at 128 MB, where the old whole-list JSON request failed. Chromium loaded its ~100,035-row document and invoked print in about 19.8 seconds; one-year ~9,772 rows loaded in about 660 ms. Generating and saving a 100,000-row PDF was not measured. Browser rendering and the print dialog can still be slow at that scale, so Staff can narrow the filters. Neither this run nor the original benchmark measures production Apache on the clinic computer.

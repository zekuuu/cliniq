# ADR-013: Frontend Data Fetching — Plain Async Hook Boundary

**Date:** Sunday, September 27, 2026 — 15:09
**Status:** Accepted

*Note (Thursday, November 19, 2026 — 12:18 PHT):* superseded for the server-paged lists by [ADR-082](ADR-082-Server-Side-Pagination-Of-The-Long-Lists-And-TanStack-Query.md), which revisits this decision for "pagination coordination", as foreseen below. Those lists use TanStack Query through `usePagedList`. Every other screen keeps `useAsyncData`.

## Context

The frontend-first phases run against mock APIs while the Laravel API and database schema remain unfinished. The original F0 checklist left TanStack Query, SWR, and plain fetch/context open. The current React/Vite app already has a small `useAsyncData` hook that centralizes loading, error, retry, and refetching behavior without adding a client-state dependency.

## Decision

Use the existing plain promise-based `useAsyncData` boundary for the frontend-first and initial API-integration phases. Feature `api/` modules own request functions; screens consume the hook and do not call promises directly for loading state. Revisit this decision if the real API needs cache invalidation, pagination coordination, or optimistic updates that the boundary cannot support cleanly.

## Consequences

- No additional data-fetching dependency is added to the 4GB-RAM LAN target.
- Existing screens share one loading/error/retry contract and can be migrated to real Laravel requests by changing feature API modules.
- TanStack Query/SWR remains a future option, not an implicit dependency.

Canonical documents that mention the frontend data-fetching choice should be updated when the next canonical-doc maintenance pass occurs.

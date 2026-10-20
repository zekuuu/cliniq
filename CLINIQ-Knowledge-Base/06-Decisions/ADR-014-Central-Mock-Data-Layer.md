# ADR-014: One Central Mock-Data File and One Data-Access Layer

**Date:** Monday, September 28, 2026 — 09:18
**Status:** Accepted
**Note (Wednesday, October 21, 2026 — 01:09):** the QR feature this ADR mentions was removed (ADR-027, [2026-10-21-remove-qr-feature](../08-Logs/Agent-Sessions/2026-10-21-remove-qr-feature.md)); the rest of the decision stands.

## Context
Frontend-first development (ADR-006) left mock data spread across the app. A seeded generator
(`lib/mocks/dataset.ts`, 930 students) fed 14 feature `api/` modules and six pages that read it
directly. Other screens carried their own inline records: User Management and the mock session
hardcoded user accounts (one used the name of a real staff member), Backup Verification hardcoded a
date, size, and status, and New Visit/Incident Entry held their own complaint lists. Derived values
were computed in several places (the Dashboard aggregator, the Reports page, the Inventory list's
own low-stock check), and no write persisted anywhere, so a visit saved on one screen never showed
up on another. The cross-screen flows in `Activity-Diagram.md` couldn't actually be simulated.

The project owner asked for one centralized mock-data file, read through one data-access layer, so
that editing the file changes every page consistently.

## Decision
1. **One file:** `frontend/src/lib/mock-db/mock-db.json`. Top-level keys: `meta`, `config`,
   `users`, `students`, `visits`, `incidents`, `followUps`, `inventoryItems`, `reports`,
   `backupLogs`, `auditLog`, `frontendOnly`. About 50 students, sized for hand-editing.
2. **Raw records only.** Every derived value is computed by selectors in the layer, never stored in
   the JSON or computed in a component. This covers dashboard counts, trends, calendar counts,
   frequent-visitor flags, incomplete-record status (`Student.recordComplete`), low-stock/expiry
   flags, follow-up due states, backup status, and report contents (`Report.data`). A Vitest
   integrity test rejects a stored derived value, a dangling reference, a malformed or duplicate
   Student Number, an invalid enum value, or an absolute date. No validation library is added.
3. **Shapes are §5's, not a schema.** Records match Frontend Context Brief §5 (`types/entities.ts`),
   with only three seed-level differences: relative dates, Student Number references, and derived
   fields omitted. The ERD is still TBA. Data a screen needs that §5 doesn't define lives under
   `frontendOnly`, labelled mock-only (listed below for review).
4. **Dates never rot.** Seed dates are `{daysAgo}` / `{daysFromNow}` offsets resolved against one
   injectable "today".
5. **The layer is the API swap point.** `lib/mock-db/api.ts` exposes async functions (simulated
   latency, `?mock=slow|error|empty` preview switches). Writes update an in-memory store and append
   to `auditLog` in the same call. Feature `api/` modules call the layer, and pages call feature
   modules through `useAsyncData` (ADR-013). When the Laravel API lands, `api.ts` becomes HTTP calls.
   Persistence across reloads is opt-in (`?mockPersist=on`), with a one-call reset.
6. **Synthetic data only.** Every person, number, allergy, and condition is fictional. `meta.notice`
   states this, and the integrity test fails if it's removed or a dev password isn't obviously fake.
7. **New Audit checkpoint** in `Frontend-Loop-Engineering.md`: a screen passes only if it holds no
   inline or hardcoded data and reads only through the layer.

## Alternatives Considered
- **Keep the seeded generator.** Rejected: the data can't be hand-edited, the ~900-student volume
  isn't reviewable, and it doesn't stop pages from reading it directly.
- **MSW (Mock Service Worker) or json-server.** These would mock at the HTTP boundary, but no API
  contract exists yet, and both add dependencies outside the confirmed stack (ADR-007).
- **A validation library (zod etc.) for the integrity checks.** Not in the confirmed stack. Plain
  functions plus Vitest cover it.
- **Normalizing parent-notification attempts or adding join tables.** Rejected as implicit schema
  design while the ERD is TBA. §5 keeps attempts nested on Incident, and so does the seed.

## Consequences
- Every screen now has a real skeleton, empty, and error state reachable through the preview
  switches (Incident Report, Parent Notification, QR Print, Dispense, User List/Form, and Backup
  didn't before).
- Writes are real within a session: a recorded visit appears on the Visit Log, the student's
  profile, and the Dashboard, and a follow-up created with it appears on the Dashboard's due list.
- The main bundle grew from about 264 kB to 355 kB, because the mock session (used by `App.tsx`)
  loads the seed. This is mock-only weight that goes away with Sanctum/the real API.
- **`frontendOnly` additions to review when the ERD is designed:** `devAccounts` (credentials,
  `mustChangePassword`), `visitComplaintTypes` (incl. Smart Triage checklist steps),
  `incidentComplaintTypes`, `inventoryTransactions` (dispense/restock history), `recordReviews`
  (Registrar-import review and who-resolved tracking), `excuseLetterApprovals`, `peReferrals`.
- **Open product decisions (not requirements, values carried over from the Dashboard mock):**
  `frequentVisitorMinVisits` (3), `frequentVisitorWindowDays` (30; the Dashboard uses its selected
  range instead), `upcomingFollowUpDays` (7), `expiryWarningDays` (30), `clusterMinCount` (8),
  `clusterRatio` (2), `topComplaints` (5). Also open: whether stock *at* the threshold counts as
  low (currently strictly below).
- **No canonical-document change is needed for the decision itself.** It's an implementation
  choice within ADR-006/ADR-013. The open product decisions above belong in the Project Plan /
  Modules & Features once the nurse and team decide them.

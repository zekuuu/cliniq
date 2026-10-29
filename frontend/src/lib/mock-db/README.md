# mock-db: the frontend's single source of mock data

Last checked against the code on Thursday, October 29, 2026 (commit dde64408).

Every CLINIQ screen reads and writes data through this folder during the frontend-first phases
(ADR-006). Edit `mock-db.json` and every page changes with it. Decision record:
`CLINIQ-Knowledge-Base/06-Decisions/ADR-014-Central-Mock-Data-Layer.md`.

> **Synthetic data only.** This repository is public, and these are minors' health records under
> RA 10173. Every name, LRN, phone number, allergy, and condition in `mock-db.json` is
> invented. Never paste a real Mendez Christian Academy student or staff member into it. The
> integrity test checks that the notice in `meta` is still there and that dev passwords are
> obviously fake.

## How it fits together

```
mock-db.json        raw records only (hand-edited, never written at runtime)
  └─ seed.ts        the ONLY importer of the JSON; resolves relative dates
     └─ store.ts    in-memory copy + every write since; injectable "today"; reset; persistence
        ├─ selectors.ts / dashboard.ts   every derived value (counts, flags, due states…)
        └─ api.ts   async reads/writes, audit logging, latency + preview switches
           └─ index.ts   public surface → features/*/api/*.ts → pages
```

Pages never import this folder's internals, and nothing outside `seed.ts` imports the JSON.
The one exception is `holidays-ph.json`: real nationwide holidays with fixed proclamation dates
(not synthetic, not relative), read only by `getHolidays` in `api.ts` (ADR-020). Add each new
year's proclaimed dates there, with the proclamation references in its `meta`, until the backend
sync job replaces it; `holidays.test.ts` pins the list to the proclamation texts.
Feature `api/` modules import from `lib/mock-db` (the index). When the Laravel API lands, `api.ts`
is the file that becomes HTTP calls. Nothing above it has to change.

## Editing `mock-db.json` safely

1. **Store raw facts, never results.** No counts, totals, `recordComplete`, `isLowStock`,
   `dueState`, `flags`, report `data`… Selectors compute all of those. To make an item low-stock,
   lower its `currentStock`. To make a record incomplete, blank its `contactInfo` or set
   `emergencyContacts` to an empty array. The integrity test names the field if you store a derived value.
2. **Dates are relative.** Use `{ "daysAgo": 3 }` or `{ "daysFromNow": 11 }`. Timestamps add
   `"time": "HH:MM"` (Philippine time). Absolute dates are rejected because they go stale. Past clinic
   activity (visits, incidents, letters, transactions, audit rows, follow-ups) resolves to a school day:
   a Saturday or Sunday moves back to the Friday before (`toSchoolDay` in `relativeDates.ts`), so no
   weekday changes the picture. Today is never moved; backups and calendar events keep their days.
   Two visits never share a minute, and care notes never name a medicine the visit's lines lack
   (`countsAndSeed.test.ts` checks all three).
3. **Reference by key.** Visits, incidents, follow-ups, reviews and stock transactions point at a
   student by its internal `studentId`. A visit, incident, follow-up or stock transaction can instead be
   about a staff member (ADR-043): it then has `"studentId": null` and a `personnelId`. Exactly one of the
   two is set (a restock or stock adjustment has neither); a row without `personnelId` reads it as null.
   Staff have a unique `staffNumber` (`STF-0001`) and a `type` from `config.personnelTypes`, and no LRN,
   grade, sex or excuse letter. Each student has a unique 12-digit `lrn`, clearly synthetic
   (`000000` + enrolment year + sequence; ADR-028). Follow-ups point at an existing visit or incident *of
   the same patient*. Users are referenced by `id`. Complaints must come from
   `frontendOnly.visitComplaintTypes` / `incidentComplaintTypes`.
4. **Keep ids readable and unique:** `student-0053`, `personnel-0004`, `visit-0160`, `item-0015`, `user-staff-02`.
5. **Shapes follow Frontend Context Brief §5** (`src/types/entities.ts`). This isn't a database
   design; the [ERD](../../../../CLINIQ-Knowledge-Base/02-Architecture/Database/ERD.md) is a proposed draft, not final or approved. Anything a screen needs that §5 doesn't define lives under
   `frontendOnly` and is labelled mock-only. Don't add new top-level entities. The one exception is
   `personnel`, the staff patients of ADR-043.
6. **Thresholds live in `config`.** They're open product decisions, not requirements (ADR-014). ADR-051 chose new starting values (a frequent visitor is 3 visits in 14 days; follow-ups overdue after 3 days and closed after 7); they are decided, not built, so `config` still holds the older values. `showFrequentVisitors` (true/false, true) shows the Dashboard's Frequent-visitor panel, which lists the top five until "Show all"; false hides it. Each inventory item has an optional `brand` (`"generic"`, `"branded"`, or `null` for Not specified, PROVISIONAL); a browser that saved state before these existed is migrated in `store.ts` (`migratePersistedState`).
7. Run the checks:

   ```bash
   npm test -- mock-db        # integrity + selectors + cross-screen sync
   npm run typecheck          # shape check of the JSON against the §5 types
   ```

   The app also refuses to start with a clear error listing every problem if the JSON fails the
   integrity check, so a bad edit can't quietly render wrong screens.

The seed must keep demonstrating every state on any day it's opened: overdue, due-today, and
upcoming follow-ups; expired, expiring-soon, and low-stock items; a Stage-1 incident; an
incomplete record; frequent visitors; visits today. `integrity.test.ts` checks this against
several far-apart "todays".

## Preview switches (dev only)

Add to any URL (see `devToggles.ts`):

| Query | Effect |
|---|---|
| `?mock=slow` | every call waits 2.5 s, so skeletons stay on screen |
| `?mock=error` | every call fails (error states) |
| `?mock=empty` | every read returns empty collections (empty states) |
| `?mockEmpty=visits,incidents` | empty only those collections, e.g. a profile with no history |
| `?mockLatency=1200` | explicit latency in ms (default 450) |
| `?mockPersist=on` / `off` | keep writes across reloads in localStorage (off clears them) |
| `?mockReset=1` | throw away every write and reload from the JSON |

In the browser console (dev builds): `cliniqMockDb.reset()`, `cliniqMockDb.setToday('2026-12-01')`,
`cliniqMockDb.setPersistence(true)`, `cliniqMockDb.snapshot()`, `cliniqMockDb.load(state)`.

**Load check at the school's scale:** `frontend/scripts/generate-load-data.mjs` (dev only, never bundled)
grows a snapshot to about 600 students and five years of visits, incidents and stock movements. The
result (about 7 MB) is too large for localStorage, so load it with `cliniqMockDb.load(...)` and move
between screens without reloading.

A copy saved in localStorage before a field changed shape is migrated when it loads
(`migratePersistedState` in `store.ts`): inventory batches, a missing Sex, and the parent-notification
outcomes renamed in panel review part 1 (`voicemail` and `left_message` become `left_message_or_voicemail`,
`not_reached` becomes `no_answer`). The old values appear only there and in its test. A copy saved
before staff patients (ADR-043) gets an empty `personnel` list, the staff types, and `personnelId: null`
on every record. Every screen now reads both kinds of patient; lists show the Staff No., never a name.

## Dev accounts

One account per role, plus `demo.new` (a second School Clinician), which has `mustChangePassword: true` for the Force Password
Change screen (#2). Passwords are in `frontendOnly.devAccounts` and are deliberately fake
(`demo-…` / `dev-only-…`). The mock session (`session.ts`) exists only after a successful Login with one of
these accounts. It lasts one week, like the planned Sanctum token, and Log out ends it.

| Role | Username | Password | Password change required |
|---|---|---|---|
| School Clinician | `demo.nurse` | `demo-nurse` | No |
| Admin / Principal | `demo.principal` | `demo-admin` | No |
| School Clinician (password-change scenario) | `demo.new` | `demo-change` | Yes |

These are synthetic development fixtures only, not production credentials. The Login screen displays
these accounts for local demo purposes. There is no URL role override and no default account: every
screen redirects to Login until someone signs in (ADR-002, security clarification), so each audited
action is attributable to a real sign-in. Force Password Change is exercised by signing in as
`demo.new`; that account gets no session until its password is changed.

## Writing a new screen

- Add a request function to the feature's `api/` module that calls `lib/mock-db`. Load it with
  `useAsyncData` (ADR-013) and give the page a skeleton, an empty state, and an error state.
- Mutations go through a layer function, which writes the audit entry
  (`.claude/skills/cliniq-audit-trail/`). Don't call anything audit-related from a component.
- No inline arrays of records, counts, names, or dates in a component. If a value can be derived,
  add a selector.

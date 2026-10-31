# CLINIQ URL Parameters

This is the single reference for query-string parameters used by the frontend.

Use query parameters for the state of an existing screen. The path identifies the screen itself.
For example, `/inventory?attention=expiry` means “open Inventory filtered to expired or expiring
items.”

## Active parameters

### Mock-data and preview switches

These are development-only switches. They affect the frontend mock data layer and should not be
treated as production authentication, API, or database settings.

| Parameter | Accepted values | Effect | Example |
|---|---|---|---|
| `mock` | `slow`, `error`, `empty` | Preview loading, error, or all-empty states. Without it, normal mock behavior is used. | `/?mock=slow` |
| `mockEmpty` | Comma-separated collection names | Makes only the listed mock collections empty. | `/?mockEmpty=visits,incidents` |
| `mockLatency` | Non-negative milliseconds | Overrides the normal mock request delay. | `/?mockLatency=1200` |
| `mockPersist` | `on`, `off` | Enables or disables persistence of mock writes across reloads. | `/?mockPersist=on` |
| `mockReset` | `1` | Clears persisted mock writes and reloads the seed data. | `/?mockReset=1` |

Valid `mockEmpty` collection names are:

`users`, `students`, `personnel` (staff patients), `visits`, `incidents`, `followUps`, `inventoryItems`, `reports`,
`backupLogs`, `auditLog`, `issueReports`, `calendarEvents`, `sportsReports`, and `holidays` (empties the bundled holiday list, to preview the calendar's "No holidays loaded" warning).

Useful combinations include:

- `/?mock=slow` — inspect loading states (sign in first as the role you want to see).
- `/?mock=error` — inspect error states.
- `/?mockEmpty=visits,incidents` — inspect a student profile without visit or incident history.
- `/?mockPersist=on&mockReset=1` — start from clean seed data, then keep later writes after reload.

### Screen-state and workflow parameters

| Parameter | Used on | Accepted value | Effect | Example |
|---|---|---|---|---|
| `item` | Add/Edit Inventory Item | An inventory item ID | Opens the inventory form in edit mode for that item. Without it, the form is for a new item. | `/inventory/new?item=item-0001` |
| `focus` | Student List | `search` | Meant to focus the student search field; `Alt + K` links here. **Does not work at present:** on Thursday, October 29, 2026 the field was not focused when the page opened (see the `FIX` in Issues-and-TODOs). | `/students?focus=search` |
| `search` | Inventory | Any text | Opens Inventory with this text in the search box. Read only on arrival. Built by Add Item's duplicate warning. | `/inventory?search=Paracetamol` |
| `letter` | Visit Log | `pending` | Opens the Visit Log on visits with a pending excuse letter, over a range that includes older outstanding letters. Read only on arrival. Built by the Dashboard's Pending excuse letters card (`paths.visitsWithPendingLetter`). | `/visits?letter=pending` |
| `letter` | Excuse Letter | A letter ID | Opens that version of the visit's excuse letter (`paths.excuseLetterVersion`). | `/visits/visit-0001/excuse-letter?letter=<letter-id>` |
| `inClinic` | Visit Log | `1` | Opens the Visit Log filtered to patients still in the clinic. Read only on arrival. No screen links to it at present. | `/visits?inClinic=1` |
| `patient` | Visit Log, Incident Log, Follow-Ups | `students`, `staff` | The Everyone / Students / Staff filter (ADR-043). Everyone is the default and leaves the address clean. Changes use replace navigation. | `/visits?patient=staff` |
| `staff` | New Visit, Report Incident | A staff patient ID | Opens the form with that staff member chosen. Built by the Staff Profile's Record a visit and Record an incident (`paths.visitNewForStaff`, `paths.incidentNewForStaff`). | `/visits/new?staff=personnel-0001` |
| `fromVisit` | Report Incident | A visit ID | Escalate to incident (ADR-036): carries the patient, complaint, time and temperature over from that visit. Built by Visit Details. | `/incidents/new?fromVisit=visit-0001` |
| `from`, `to` | Visit Log, Incident Log | Both valid `YYYY-MM-DD` dates, `from` not after `to` | **Entry filters only.** Opens the list on that custom range and remains in the URL until the user changes the in-screen range. That change removes only `from` and `to` with replace navigation, so reload then uses the default All range. Invalid or missing values fall back to All. Built by Dashboard range drill-throughs and `paths.visitsOnDate(date)`. | `/visits?from=2026-10-07&to=2026-10-07` |
| `attention` | Inventory | `low_stock`, `expiry` | Opens Inventory filtered to low-stock items or items that are expired or expiring. Invalid values show all stock. | `/inventory?attention=expiry` |
| `view` | Dashboard | `trends` | Opens Dashboard Trends. `calendar` is retained only as a legacy value and replaces to `/calendar`. | `/?view=trends` |
| `sex`, `grade` | Dashboard | `sex`: `female`, `male`; `grade`: a grade level such as `Grade 7` | The Trends demographic filters. Set and cleared by the Dashboard itself. | `/?view=trends&sex=female` |


## Not active in the current router

### `student`

`?student=<Student Number>` (the Student Number itself was dropped, ADR-027) pre-selected the student on New Visit, Report Incident, PE/Sports Referral and Dispense. It was removed on Wednesday, October 21, 2026: once the QR hub was gone nothing in the app linked with it, so the School Clinician picks the student on the form.

### `role`

`?role=staff|admin|instructor` used to select the mock session's role with no credentials. It was removed on Wednesday, September 30, 2026: every screen now requires a real Login, so each audited action is attributable to the account that signed in (`CLINIQ-Knowledge-Base/06-Decisions/ADR-002-QR-Staff-Only-Redesign.md`, security clarification). To see a role, sign in with that role's demo account.

### `user` (Force Password Change)

`/force-password-change?user=<id>` used to choose whose password was being changed, which let anyone set any account's password without signing in. It was removed the same day. The account now comes from the Login step that just verified its credentials.

### `screen`

`?screen=...` was used by the original frontend scaffold to preview screens, for example
`?screen=dashboard` or `?screen=new-visit`. It is retired. The app now uses React Router path-based
routes such as `/`, `/visits/new`, and `/students`.

`?screen=...` is therefore not a supported way to open a screen now.

### `mode=edit`

`?mode=edit` was also part of the earlier scaffold. Inventory editing now uses
`/inventory/new?item=<item-id>`, while student editing uses the path
`/students/<student-id>/edit`. Do not add `mode=edit` to new links.

### Documented examples that are not implemented yet

The routing decision uses `/visits?dateRange=last30days` as an example of a future in-screen filter,
but the current code does not read `dateRange`. It is not an active parameter yet.

## Important behavior

- Query parameters are case-sensitive; use the spellings shown above.
- Unknown values are ignored or treated as defaults. For example, an unsupported `mock` value uses
  normal mode. No query parameter signs anyone in or changes the signed-in role.
- Mock preview switches are read from the current URL. In-app navigation does not automatically carry
  every query parameter to the next screen, so append the switch again when testing another route.
- These mock switches are temporary frontend-development tools. They will be removed or replaced
  when the Laravel API and Sanctum authentication become the active implementation.

## Source files

- Mock switches: `frontend/src/lib/mock-db/devToggles.ts`
- Mock session (created only by Login): `frontend/src/lib/mock-db/session.ts`
- Shared route builders: `frontend/src/routes/paths.ts`
- Route-level query handling: `frontend/src/routes/AppRoutes.tsx`
- Shared date-entry handling: `frontend/src/hooks/useDateRangeEntryParams.ts`
- Patient filter: `frontend/src/hooks/usePatientFilter.ts`
- Other screen-state parameters: the page that reads them under `frontend/src/features/`
  (Visit Log, Report Incident, New Visit, Inventory, Excuse Letter, Dashboard)

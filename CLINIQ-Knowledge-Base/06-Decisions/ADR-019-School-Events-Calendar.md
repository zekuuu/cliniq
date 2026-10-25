# ADR-019: Staff Maintain School Events on the Dashboard Calendar

**Date:** Wednesday, October 07, 2026 — 16:48
**Status:** Accepted. **Item 2 amended by [ADR-042](ADR-042-Admin-Manages-Calendar-Events.md) (Sunday, October 25, 2026 — 23:55 PHT): the Admin can also add, edit and delete events.**
**Note (Wednesday, October 21, 2026 — 01:47):** the PE/Sports Instructor role, the phone-only screens and the `?student=` parameter this ADR may mention were removed (ADR-029, ADR-033, [2026-10-21-remove-phone-screens-and-instructor](../08-Logs/Agent-Sessions/2026-10-21-remove-phone-screens-and-instructor.md)); the rest of the decision stands.

## Context
The Dashboard calendar (Module 9) showed only the free-text event tag Staff typed on a visit or
incident. An event could not exist on a day with no visits, including any future date. A fuller,
separately managed school-events calendar was deferred as a future decision (Module-Overview,
"Future Decision: Full School-Events Calendar"; Project Plan §1.4; Issues-and-TODOs) because two
questions were open: who maintains the events, and what the management screens look like.

The project owner has now answered both: Staff maintain the events from the Dashboard calendar, and
Admin/Principal only views them.

## Decision
1. **This reverses the earlier deferral.** School events are their own records, plotted on the
   Dashboard calendar beside clinic activity.
2. **Staff maintain them; Admin/Principal views them.** Admin sees the same event chips on a static
   calendar. Admin still has no write permission anywhere. PE/Sports Instructors have no calendar.
3. **One entry point per day.** Staff click (or press Enter on) any calendar day, past, today, or
   future. A dialog on the shared Modal shows the date, the visit and incident counts (past and
   today only), that day's events with edit and delete icons, an Add Event button, and a
   "View visits" link to the Visit Log filtered to that day. This replaces the per-cell
   "View ›" / "View activity" links. Delete asks for confirmation. Focus returns to the day.
4. **Event fields:** title (required, at most 60 characters), start date, optional end date (not
   before the start date; multi-day events are common), who created it, and created/updated
   timestamps. Stored as `frontendOnly.calendarEvents` in the mock data layer, **provisional pending
   the ERD** (ADR-014).
5. **Display:** a yellow chip (existing tag style) on every day an event covers, including empty and
   future days; at most 2 chips per day, then "+N more". Events come first, then visit/incident
   tags. A tag whose text matches one of that day's events (case-insensitive) is shown once.
   Existing tags are not migrated or changed. The Table view lists events too.
6. **Audit:** create, update, and delete are each audit-logged (`calendar-event` target, its own
   "Calendar event" filter in the Audit Log Viewer).
7. **Navigation and filters added for this:** Staff's calendar Next button pages into future
   periods (Admin's still stops at today). The Visit Log reads `?from=YYYY-MM-DD&to=YYYY-MM-DD` as
   its initial custom range (`URL-Parameters.md`). In the Yearly view, Staff open a day from the
   "Activity and event days" list; the small day squares stay visual only.

## Alternatives Considered
- **Admin/Principal maintains events.** Rejected by the project owner; it would have been that
  role's first write permission.
- **Keep the tag-only calendar.** Rejected: events could not be placed on future or empty days.
- **An add icon in every cell, or an anchored popover.** Rejected for one entry point per day on
  the existing keyboard-safe Modal, with no new positioning code.
- **Migrate existing tags into events.** Out of scope; tags stay as they are, deduplicated only on
  display.

## Consequences
- Holidays are a separate, later decision and are not covered here.
- Adds a little data-entry work for Staff, which the project owner accepted.
- **Canonical documents need updating** (not edited here, per Source of Truth rules):
  `CLINIQ_Modules_and_Features.md` (Module 9 access and calendar bullet; the "Future Decision: Full
  School-Events Calendar" section), `CLINIQ_Project_Plan.md` §1.4 out-of-scope line and the Clinic
  Overview Dashboard row, and `CLINIQ_Frontend_Context_Brief.md` §5 note ("deliberately no separate
  SchoolEvent entity") and §9. The vault mirror `00-Project-Core/Scope.md` carries the same §1.4
  line and should follow the Project Plan update.
- The `CalendarEvent` shape is a mock-layer shape, to be reviewed when the ERD is designed.

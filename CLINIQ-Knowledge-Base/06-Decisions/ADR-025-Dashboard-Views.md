# ADR-025: Dashboard Shows One View at a Time (Overview / Trends / Calendar)

**Date:** Thursday, October 15, 2026 — 19:08
**Status:** Accepted (requested by Ghenly, project manager; details agent-decided)

## Context
The Clinic Overview Dashboard loaded every section at once: stat cards, three alert groups, Staff's
pending excuse letters, complaint trends, and the Visit calendar, one under the other. A groupmate review
called it cluttered ("masakit sa mata"). On Wednesday, October 14, 2026 an agent decided to collapse only
the yearly calendar's day list and keep everything else open, because `03-Design/Design-System.md` says
the low-stock/expiry and follow-up alerts must be visible from the Dashboard (Issues-and-TODOs, "The
Dashboard shows too much at once", marked "Decided by the agent, the team may overrule"). The project
manager overruled it: she asked for toggle buttons, such as a Calendar button that shows only the
calendar, so the user switches between focused views instead of scrolling past everything.

## Decision
- **Three views, one at a time**, switched by a tab strip under the header and the Staff shortcuts:
  **Overview** (stat cards, the three alert groups, and Staff's pending excuse letters), **Trends**
  (complaint trends with the symptom-cluster note), and **Calendar** (the Visit calendar and its day
  panel). The header (title, Date range, Print) and the Staff shortcuts strip stay above every view.
  No "All" view. Staff and Admin/Principal get the same three views; Admin's Overview simply has no
  excuse letters.
- **Overview is the default and holds the alerts**, so the alerts are on screen whenever the Dashboard
  opens. The Overview tab also carries a warning badge with the number of alert rows (follow-ups +
  frequent-visitor warnings + inventory alerts, from the summary already loaded), visible from every
  view.
- **The view lives in the query string**: `?view=trends`, `?view=calendar`; Overview has no parameter;
  an unknown value opens Overview. Switching replaces the history entry, so Back still leaves the
  Dashboard in one step (ADR-024).
- **Every view stays mounted.** Hidden views keep their state (calendar period, Weekly/Monthly/Yearly,
  Calendar/Table) and don't refetch; they stay laid out at full width so a chart in a hidden view sizes
  itself correctly.
- **Print prints everything**, whichever view is open, in the same order and layout as before; the tab
  strip doesn't print.
- **The Date range applies to Overview and Trends only.** On the Calendar view the picker and the
  header's "Showing …" text are replaced on screen by "Date range not used in Calendar"; the print
  header still shows the range.
- Built on a shared ARIA `Tabs` component (`frontend/src/components/ui/Tabs.tsx`), one size above the
  in-card `SegmentedControl` toggles.

This supersedes the October 14 decision to disclose only the yearly day list. That disclosure stays.

## Alternatives Considered
- **Keep everything open and collapse only the day list** (the October 14 decision): overruled by the
  project manager.
- **Collapse sections in place ("show more")**: still one long page and hides alerts behind a click.
- **Unmount hidden views**: simpler, but loses the calendar's state, refetches on every switch, and
  print would need everything mounted anyway.
- **Hide hidden views with `display: none`**: tried first; a chart created inside it has no size, and
  the trend chart printed blank when the user printed from Overview.
- **An attention line inside Trends and Calendar** instead of the tab badge: one more element per view;
  the tab strip is already always visible, so one badge on it covers every view.
- **Disable the Date range on Calendar** instead of replacing it: a disabled control reads as broken and
  still suggests it filters the calendar.

## Consequences
- A nurse who stays on Trends or Calendar sees alerts only as the Overview badge count.
- New Dashboard sections must be placed in one of the three views (or above them if they are global).
- Links can open a view directly (`/?view=calendar`).
- The Reports screen's own tabs still use their older markup (`LATER` in Issues-and-TODOs).
- The canonical Frontend Design Reference (Reference 1 layout) needs the view structure.

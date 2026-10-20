# Intuitive Shortcuts and Efficiency of Use

**Added this session, per an explicit software-engineering/usability principle the team wants built in from the start.**

## The principle
This maps to Nielsen's usability heuristic **"Flexibility and efficiency of use"**: *accelerators — unseen by the novice user — may often speed up the interaction for the expert user, such that the system can cater to both inexperienced and experienced users.* CLINIQ's nurse is exactly this "expert user" case: someone who will perform the same handful of actions dozens of times a day, every school day, for years. A system that's only ever as fast as a first-time user's path through it is systematically wasting her time.

## How this is different from what's already built
This requirement covers **in-app keyboard navigation**: the desktop workstation is used constantly, so frequent actions should be reachable without the mouse.

## Candidate shortcuts (to refine during frontend construction, not finalized)
- Jump to New Visit Entry
- Jump to student search
- Save-and-new (submit the current form, immediately open a blank one of the same type) — likely the single highest-value shortcut given how repetitive visit logging is
- Jump to the Clinic Overview Dashboard

## Design constraints this must respect
- **Discoverable, not hidden-only** — per the "accessible to non-technical stakeholders" principle already in the Frontend Context Brief, shortcuts must not be the *only* way to do something, and should be listed somewhere findable (e.g., a small "?" help overlay), not assumed knowledge.
- **Never override a browser or OS default** a non-technical user would expect to keep working (e.g., don't remap Ctrl+S in a way that breaks expectations).
- **Consistent across the app** — the same shortcut always does the same kind of thing, matching the existing Consistency principle in the Design & UX Guidelines.

## Status
Requirement confirmed; specific key bindings not yet finalized — this is frontend-construction-phase work, to be settled once the 5 reference screens (see `03-Design/Reference-Screens.md`) are built and there's a real UI to bind shortcuts to.

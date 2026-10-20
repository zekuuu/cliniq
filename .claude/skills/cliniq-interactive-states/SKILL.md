---
name: cliniq-interactive-states
description: Apply whenever building or reviewing any button, link, dropdown/select, icon action, or navigable list row/card. Ensures cursor states, hover feedback, and dropdown styling are never left as unstyled defaults.
---

# CLINIQ Interactive States

This skill exists because the first real build (the Dashboard) shipped without cursor states, without hover feedback, and with native unstyled dropdowns — despite hover already being listed as a required state in the design system. The requirement wasn't new; it was just too vague to actually verify against. This skill makes it concrete and checkable.

## The rule, per element type

**Anything clickable gets `cursor: pointer` on hover. Anything not clickable doesn't.** Buttons, links, dropdown/select triggers, icon-only actions, table/list rows that navigate on click — all of these. Don't add pointer cursor to static text or non-interactive containers just because they're near something clickable.

**Every interactive element needs a real hover color, not just a cursor change:**
- Primary buttons (`brand-green-dark` fill, white label) → lighten slightly on hover (`hover:brightness-125`). Never use a `brand-green` fill under a white label: button labels are small text, and that pairing is only 3.74:1
- Secondary/outlined buttons → pick up a light `surface` background tint on hover
- Destructive buttons (`error` fill) → darken the same way
- Icon-only actions → the icon itself changes color on hover, with no background box (see below)
- Plain list rows/cards that navigate → subtle `surface` background tint on hover, so the whole row visibly responds
- Links → an underline or color shift, not silence

**Clickable icons stay bare icons; don't style them as buttons.** An icon-only action (show password, a field's clear ✕, a collapse chevron) is enough on its own. Don't give it a background fill, a border, or a `surface` box that appears on hover. Its hover feedback is the icon's own color shift (`text-secondary` → `brand-green-dark`), plus the pointer cursor. A red `text-error` icon (Log out) darkens instead (`hover:brightness-75`), matching how destructive buttons darken. The click area is the icon too: size the button to the glyph, with no padding or fixed box, so the pointer cursor and hover begin only over the icon, and the `focus-visible` ring hugs it (`rounded-sm`, offset 2). Underneath, it's still a real `<button type="button">` with an accessible name (`aria-label`). "Not a button" means not *styled* as one, and not *sized* as one either; never make a clickable `<span>` or `<svg>`. Reach for a visible button with a text label only when the action needs emphasis or the icon alone wouldn't be understood. Reference: the password reveal in `frontend/src/components/ui/Input.tsx`.

**Navigable cards and list items need an affordance visible at rest.** Do not make a whole card or
row a silent click target signaled only by cursor/hover. A widget's drill-down lives on the
widget's own name, via the shared `TitleLink` (`frontend/src/components/ui/TitleLink.tsx`): the stat
card label or list-card title (pass `titleTo` to `ListCard`) becomes the link, keeps its own color at
rest, and carries a small (12px), bold (stroke 3) open-link icon (square with an arrow leaving its corner) that stays
glued to the last word so it never wraps alone. Hover adds an underline plus a color shift: tinted
or grey labels darken (`hover="darken"`, the default); near-black list titles turn
`brand-green-dark` (`hover="brand"`) — never grey. No separate `View all` link, and the stat card's
tone-icon chip stays a plain icon. A list card's count badge stays outside the link. Individual list
items link only the identifying text and show its at-rest underline/color plus a smaller chevron;
keep that chevron `shrink-0` beside a truncating label so it can never wrap onto a line of its own.
Surrounding metadata remains static. Touch users must be able to discover navigation without hover.
`TitleLink` and `ListItemLink` also pass drill-through router state, so a top-level list they open
shows Back (`cliniq-back-navigation-patterns`).

**Toggles and view tabs share one look, in two sizes.** A toggle inside a card is the shared `SegmentedControl`; switching a whole page between views is the shared `Tabs` (`frontend/src/components/ui/Tabs.tsx`). Both mark the selected option with the raised white chip, green ring, and heavier weight (never color alone), and both give unselected options `cursor: pointer` plus a `background` tint and darker text on hover. Both use the shared radius scale: an 8px (`rounded-md`) track with 6px (`rounded-sm`) chips. Don't hand-roll either.

**Dropdowns and selects must match the design system — never left as native OS/browser chrome.** A plain `<select>` renders with whatever the operating system defaults to, and that default has nothing to do with `brand-green`, this system's border-radius, or its focus-ring treatment. Minimum fix, no new dependency required: `appearance: none`, a custom chevron icon, and the same border/background/border-radius/focus-ring styling already used on text inputs. Only reach for a headless UI library (Radix UI, Headless UI) if genuinely richer interaction is needed later — not as the default fix for basic styling. In practice, don't style a native `<select>` at all: use the shared `Select`, `DateRangePicker`, or `MultiSelect`, which already share one look (see `cliniq-dropdown-patterns`).

**Room for the focus ring (Tuesday, October 20, 2026 — 17:42 PHT).** The one focus ring (`index.css`: 2px outline, 2px offset, never changed per component) is drawn 4px outside the element, and any `overflow` other than `visible` on an ancestor cuts it off, on both axes (`overflow-y-auto` clips horizontally too). So:
- A scrolling container whose focusable items touch its edge keeps 4px of room inside that edge without moving its items: `-m-1 p-1` (or `-mx-1 px-1` for a horizontal scroller), widening a full-width container by `0.5rem` (`w-[calc(100%+0.5rem)]`), as the sidebar nav and the phone navigation do.
- It also gets scroll padding (`scroll-py-1` vertical, `scroll-px-1.5` horizontal), so focus scrolling stops short of the edge. The page itself has `scroll-padding-block` that clears the sticky 4rem top bar.
- Do not rely on Chrome to reveal a partly visible element; `main.tsx` scrolls every `:focus-visible` target into view (`nearest`), which honours that scroll padding.
- Never fix a clipped ring with `outline: none`, `:focus` instead of `:focus-visible`, a smaller offset or a different color. If padding would break the layout, draw it inside for that component only (`outline-offset: -2px`) and say so.
- Check with the focus audit (`%USERPROFILE%\cliniq-audit\audit-focus.mjs`, Session 2026-10-20-focus-outline-clipping-audit), not by eye.

**"Show more fields" (Tuesday, October 20, 2026 — 20:20 PHT).** Rarely filled, optional fields on an entry or edit form sit in the shared `ExpandableSection` (`frontend/src/components/ui/ExpandableSection.tsx`), placed under the fields filled every time. First use: the visit's five logbook fields (`features/clinic-visits/LogbookFields.tsx`).
- The trigger is a real `<button>` with the small secondary Button look, a `chevronDown` that turns over when open, the label **Show more fields** / **Show fewer fields**, `aria-expanded` and `aria-controls`. Opening never moves focus; the first field inside is simply next in the Tab order.
- Closed, the content is `hidden`: out of the Tab order and the accessibility tree, never just zero height. Its values stay in the form state and are saved and counted by the "discard changes?" guard.
- Closed with something filled inside, the button says so: **Show more fields (2 filled)**.
- The form keeps it controlled and opens it by itself when editing a record that has a value inside, and when a validation error sits inside, so `useFocusFirstInvalid` still lands on that field.
- Opening plays a short slide-down (`animate-expand-down`, 150ms; off under `prefers-reduced-motion`). There is no `overflow: hidden` wrapper, so focus rings are never clipped.
- Never put a required field inside, and never move an existing field into it without asking. Read views (Visit Detail) never collapse: they show the filled fields and leave out the empty ones. Emergency readings (incident) are never collapsed: speed matters there.

## When to apply this

Every time you build or touch a button, link, dropdown, icon action, or navigable row — check this before considering it done, as part of the Audit step in `04-Development/Frontend-Loop-Engineering.md`. Don't wait for a visual review to catch a missing hover state; it should never ship without one in the first place.

## Full source

`03-Design/Design-System.md`, "Buttons, Controls & Shape Language" — the canonical, more detailed version of this rule.

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

**Dropdowns and selects must match the design system — never left as native OS/browser chrome.** A plain `<select>` renders with whatever the operating system defaults to, and that default has nothing to do with `brand-green`, this system's border-radius, or its focus-ring treatment. Minimum fix, no new dependency required: `appearance: none`, a custom chevron icon, and the same border/background/border-radius/focus-ring styling already used on text inputs. Only reach for a headless UI library (Radix UI, Headless UI) if genuinely richer interaction is needed later — not as the default fix for basic styling. In practice, don't style a native `<select>` at all: use the shared `Select`, `DateRangePicker`, or `MultiSelect`, which already share one look (see `cliniq-dropdown-patterns`).

## When to apply this

Every time you build or touch a button, link, dropdown, icon action, or navigable row — check this before considering it done, as part of the Audit step in `04-Development/Frontend-Loop-Engineering.md`. Don't wait for a visual review to catch a missing hover state; it should never ship without one in the first place.

## Full source

`03-Design/Design-System.md`, "Buttons, Controls & Shape Language" — the canonical, more detailed version of this rule.

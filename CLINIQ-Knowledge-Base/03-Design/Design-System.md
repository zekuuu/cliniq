# Design System — Full Detail

Complete design guidelines, kept in sync with the canonical **Frontend Context Brief**, Section 7, and the **Frontend Design Reference** document (both in `09-References/Canonical-Documents/`). If you edit one, edit all.

---

## 7. Design & UX Guidelines

These are system-wide frontend design requirements — they should guide every UI/UX decision across all ~35 screens, not just the ones called out explicitly elsewhere in this brief. Apply them consistently rather than re-deriving a look-and-feel per screen.

### Overall Direction
Modern, minimalist, clean, professional, approachable, consistent, easy to scan, smooth and responsive, accessible to non-technical stakeholders. Some users may have difficulty reading small text or distinguishing between many interface elements, so prioritize clarity, readability, and intuitive interaction — without tipping into looking overly simplistic or childish. When a requirement doesn't specify a UI/UX behavior, decide using this priority order: **Usability → Clarity → Accessibility → Consistency → Efficiency → Visual polish.** Never trade usability or accessibility for aesthetics.

### Typography
Small-to-medium sizing throughout — not so small it strains readability, not so large it wastes screen space. Build hierarchy through font weight, spacing, and placement rather than simply bumping font size. Keep body text comfortable to read, and keep headings, labels, body text, supporting text, and important/status information clearly distinct from each other. The overall feel should be compact and information-efficient while still comfortable to read.

The interface font is Inter. The `CLINIQ` name as a wordmark or title (sidebar, login, Privacy Policy heading) is set in Cinzel (`font-brand`), Zean's request of October 31, 2026. The live workstation date and time in the top bar uses a larger monospaced treatment (`font-mono` with tabular numbers), so its changing values scan like a clock rather than body copy; a vertical bar cleanly separates the date from the time (Zean's requests, Saturday, October 31, 2026 — 12:30 and 12:35 PHT).

**Minimum size: no rendered text below 12px (`text-xs`).** This covers sidebar group labels, the brand subtitle, badges, and calendar event tags. The stated audience includes non-technical and possibly older users who have difficulty reading small text, so this is a floor, not a style preference. Build compactness with weight and spacing, never with a smaller size.

### Buttons, Controls & Shape Language
Small-to-medium, easy to identify, consistent throughout, clearly differentiated by purpose, comfortable to interact with. Use slightly rounded corners — softened modern UI, not sharp squares, but not pill-shaped or playfully rounded either. Apply this same restrained corner-radius logic consistently across buttons, inputs, cards, dialogs, and containers, using one consistent set of radius values system-wide.

**Concrete radius mapping:** panel surfaces (cards, dialogs/modals, and containers) and interactive controls (buttons, inputs, and dropdowns) use `--radius-md` (8px). Smaller chip-scale elements (badges and menu items) use `--radius-sm` (6px). Do not introduce a separate ordinary panel or control radius.

**Every interactive element needs a cursor and a hover state — no exceptions, checked per element, not assumed.** This applies to buttons, links, dropdown/select triggers, icon-only actions, and any list row or card that navigates on click:
- **Cursor:** `cursor: pointer` on hover for anything clickable. Anything *not* clickable keeps the default cursor — don't swing to the opposite mistake of making static elements look interactive.
- **Hover color, not just a cursor change:** primary buttons (filled `brand-green-dark`) lighten slightly on hover, never to a fill that drops their white label below 4.5:1; secondary/outlined buttons pick up a light `surface` background tint; destructive buttons darken their `error` fill the same way; plain list rows that navigate get a subtle `surface` background tint on hover so the whole row visibly responds, not just the cursor.
- **Dropdowns/selects must be styled to match the design system, not left as native browser/OS chrome.** A native `<select>` renders with the operating system's own default appearance unless explicitly overridden — that default never matches `brand-green`, the token border-radius, or anything else in this system. At minimum: `appearance: none` on the element, a custom chevron icon, and the same border/background/border-radius/focus-ring treatment as a text input. If richer interaction is needed later (multi-select, search-within-dropdown), a headless component (Radix UI, Headless UI) is the option to reach for — don't add one just to fix basic styling, since the CSS-only approach covers that. **Current standard (Wednesday, September 30, 2026 — 23:20):** every dropdown takes one look, the Dashboard's date-range control — a 40px semibold trigger with a small `brand-green-dark` chevron, and a floating panel whose selected row is marked by a `surface` tint, weight, and `brand-green-dark` text. Single-choice dropdowns use the shared `Select` (a themed trigger with an accessible listbox, no dependency) rather than a native `<select>`, because a native control's open menu stays operating-system chrome. Rules: `.claude/skills/cliniq-dropdown-patterns/`. **Date pickers (Friday, October 2, 2026 — 00:39):** the same reasoning applies to native date/month inputs, whose calendars are OS chrome — date and month fields use the shared `DatePicker`/`MonthPicker` (dropdown-styled trigger, brand-themed calendar). Rules: `.claude/skills/cliniq-input-patterns/`.

**Checkboxes are themed, not OS chrome (Tuesday, November 3, 2026 — 17:52).** One global rule in `frontend/src/index.css` (`@layer base`) styles every `input[type='checkbox']`: `appearance: none`, a white box with a 1.5px `text-secondary` border (3:1 against white for non-text UI) and a 4px radius, `brand-green` border on hover, and a `brand-green-dark` fill with a white tick (a white dash when indeterminate) once set; disabled boxes go `surface`/`border`, or `text-muted` when set. Size and spacing stay with each call site (`size-4`, `mt-0.5`). Under Windows High Contrast (`forced-colors`) the OS box returns. Don't add per-component checkbox styling or `accent-*` colours; keep using a native `<input type="checkbox">` so labels, keyboard, and the shared focus ring keep working.

**Text inputs match the standard dropdown control.** The shared `Input` is 40px tall with `border-border`, a light card shadow, semibold 14px values, a `brand-green` hover/focus treatment, and the same visible label/error conventions. Field labels are 14px semibold, the same size as the typed value (Zean's request, Monday, November 2, 2026). Do not shrink a filter input below its paired standard dropdown. Rules: `.claude/skills/cliniq-input-patterns/`.

### Button Hierarchy & Color
When multiple buttons appear together, use visual weight to guide the user toward the likely action: primary actions get stronger emphasis, secondary actions stay visually quieter, cancel/neutral actions remain visible without competing, destructive actions get an appropriate warning treatment. Not every button should be equally prominent. The interface should suggest "this is probably the action you want" through hierarchy, contrast, and placement — not intrusive prompts. Never rely on color alone; pair it with labels, icons, or positioning.

Concretely, with the tokens defined below: **primary** = filled `brand-green-dark`, white text. A button label is 14px text, which is *small* text under the Color System contrast rules below, and those rules allow small white text only on `brand-green-dark` (9.19:1) — never on `brand-green` (3.74:1, fails WCAG AA). `brand-green` stays for borders, icons, and focus rings; **secondary** = outlined or `surface`-filled with `brand-green` text, no heavy fill; **cancel/neutral** = plain text or a quiet gray outline; **destructive** = filled `error` red, reserved only for genuinely irreversible actions (per the Modals & Confirmation guidance below) — never used for routine negative actions like "cancel" or "go back."

### Color System
Restrained, cohesive palette. Prioritize strong text/background contrast, consistent semantic colors, and a clear, consistent distinction between normal, primary, warning, error, success, and disabled states. Keep highly saturated colors limited and accent-color usage consistent. Don't introduce a color just for decoration — every color should communicate the same thing everywhere it appears.

**Brand colors — extracted by actually sampling pixels from the uploaded logo and poster** (median-cut color quantization, cross-checked across both images), not eyeballed. The real values turned out more vivid than a visual guess would suggest — the "gold" is closer to a pure saturated yellow than a warm amber gold, which matters for contrast, below.

| Token | Hex (sampled) | Use |
|---|---|---|
| `brand-green` | `#039935` | Primary brand color — outlines, icons, focus rings, large headings. Not a button fill (button labels are small text). **Large text/non-text UI only when paired with white** (contrast 3.74:1 — passes the 3.0 threshold for large text and UI components, fails the 4.5 threshold for normal body text) |
| `brand-green-dark` | `#035419` | Sampled from the seal's shield outline. Safe for white text **at any size** (9.19:1) — use this, not `brand-green`, anywhere white text needs to be small (nav labels, dense buttons) |
| `brand-green-light` | `#8CCC7E` | The sage-green from the logo's circular badges. Background/surface tint only — pairs well with dark text (9.16:1) but is unusable with white (1.90:1) |
| `brand-yellow` | `#EAEA09` | Secondary/accent — highlights, non-critical CTAs, badges. **Never pair with white text (1.29:1, unusable)** — always `text-primary` or `brand-green-dark` (13.49:1, excellent) |
| `brand-yellow-dark` | `#AFAF07` | Hover/active state for yellow elements. Still needs dark text even when darkened (2.34:1 with white — still fails) |
| `text-primary` | `#1A1A1A` | Main body text, headings |
| `text-secondary` | `#616161` | Supporting/secondary text |
| `text-muted` | `#9E9E9E` | Placeholder-adjacent, disabled text, timestamps |
| `background` | `#FFFFFF` | Page background |
| `surface` | `#F5F5F5` | Card/panel background, distinct from page background |
| `border` | `#E0E0E0` | Dividers, input borders, card outlines |

**Semantic colors — each one checked for contrast, not assumed:**

| Token | Hex | Use | Contrast w/ white | Note |
|---|---|---|---|---|
| `success` | `#20753A` | Active, verified, approved, or go states; confirmation messages and badges carrying white text | 5.73:1 — passes normal text | The original brighter green idea (`#2E9E4F`) only reaches 3.43:1 — fine for a large icon or bold label, not safe for a small white-text badge, so this darker shade is the one to actually build with |
| `success-light` | `#2E9E4F` | Icon color, or badge/accent paired with dark text, where a slightly brighter green reads better | — (used with dark text, not white) | |
| `warning` | `#E9882F` | Pending, in-progress, due-soon, nearing-expiration, or review-needed states: borders, bars and solid fills only (ADR-062) | Never carries white text. Solid fill takes `text-primary` (6.65:1) | Words use `warning-text` `#9A4A00` (5.49:1 on `warning-fill`). The former `#A85F00` looked brown |
| `error` / `destructive` | `#D32F2F` | Incidents, expired or critically low stock, overdue/missed work, delete/irreversible actions, and validation errors | 4.98:1 — passes | Outside the brand palette entirely — unambiguous |
| `info` | `#1976D2` | Completed, closed, resolved, and neutral informational states | 4.60:1 — passes | The one cool hue in the palette, reserved for completion and informational context |

**Semantic colours by meaning (Sunday, November 1, 2026 — 22:36 PHT, ADR-062):** from the groupmate's review, with darker text shades because her pale text failed contrast. The accent goes on the left bar, border and charts, the fill on the card, and the text shade on the words and icons. The accents are too pale to carry an icon on their own fill. Tailwind tokens: `<name>`, `<name>-fill`, `<name>-text`.

| Meaning | Accent | Fill | Text | Text on fill |
|---|---|---|---|---|
| Pending excuse letter (`letter`) | `#F7D041` | `#FBFAE8` | `#7A5C00` | 5.94:1 |
| Follow-ups to review (`follow-up`) | `#976EFE` | `#F4E8FB` | `#5B2FC9` | 6.60:1 |
| Unfinished incident record (`unfinished`) | `#E95E90` | `#FBE8F4` | `#B3185A` | 5.62:1 |
| Incidents, Expired, other danger (`error`) | `#D32F2F` | `#FBEAEA` | `#B71C1C` | 5.65:1 |
| Clinic visits, Complete (`brand-green`) | `#035419` | `#E6F2E9` | `#035419` | 7.98:1 |
| Active students (`active`) | `#0CCC6A` | `#E8FBF4` | `#0A7A41` | 5.04:1 |
| Warning, Low stock (`warning`) | `#E9882F` | `#F6EFE6` | `#9A4A00` | 5.49:1 |
| Resolved, resting (`info`) | `#1976D2` | `#E8F1FA` | `#0D47A1` | 7.56:1 |

No shade needed adjusting. Supporting `text-secondary` is at least 5.24:1 on every fill. Expired is solid red with white text (4.98:1).

**Chart hues, at most four in one chart (Sir Rey, Sunday, October 25, 2026; Sunday, November 1, 2026 — 22:36 PHT, ADR-062):** a chart on the Dashboard, Trends or Reports uses brand green (`brand-green` / `brand-green-dark`), one neutral (`text-secondary`), the warning color (`warning`, clusters) and `error` red for incidents. The by-sex chart shows Students in `brand-green-dark` and Staff in the neutral (ADR-063). Every series keeps a visible label or legend and a text alternative, so nothing is carried by color alone.

**Status mapping (Sunday, October 18, 2026 — 17:26 PHT; updated Sunday, November 1, 2026 — 22:36 PHT, ADR-062):** use `error` red for incidents, expired stock, and overdue/critical states; `success` green for complete, active, verified, approved, or go states; `warning` orange for low stock, pending, in-progress, due-soon, and review-needed states; `info` blue for resolved, resting, and informational states; the pink `unfinished` for an incident record awaiting Stage 2; the yellow `letter` for a pending excuse letter; and `neutral` gray for archived, inactive, and no-state labels. Use the soft variant for statuses inside cards and rows. Icons and text labels remain required; color never carries the meaning alone.

**Contrast rules, stated plainly:**
- Small white text: only ever on `brand-green-dark`, `success`, `error`, or `info` — never on `brand-green`, `brand-yellow`, `brand-yellow-dark`, `brand-green-light`, `success-light`, or `warning`.
- Large text (≈18pt+, or 14pt+ bold) and non-text UI such as icons and borders: `brand-green` becomes usable with white on top of the above list. A button's label is text, not a UI component, so a button fill follows the small-text rule above: primary buttons are `brand-green-dark`.
- The `-light` variants and `brand-green-light` exist specifically for badge/accent backgrounds — always pair them with `text-primary`, never white.
- Per the Accessibility guidance already in this document: pair every semantic color with an icon or label, never color alone — this matters even more here since `brand-green` is both the brand's primary identity color *and* the family `success` is drawn from.

### Layout & Spacing
**Activity calendar yearly details (Saturday, October 31, 2026 — 12:56 PHT):** the yearly view stays a visual summary of numbered date squares and marker cues. Detailed date, count, event, and holiday rows belong in the dedicated Table view rather than an expanded active-day list.

**Activity calendar yearly view (Saturday, October 31, 2026 — 12:51 PHT):** each month keeps a readable 7-column mini-calendar with visible day numbers inside enlarged 20px date squares. Heat colors, restrained brand-yellow event outlines, holiday stripes, and today's green ring remain secondary cues to the numbers.

**Activity calendar date cards (Saturday, October 31, 2026 — 12:48 PHT):** monthly date cards use one fixed height, including when a date has no events. The card clips excess labels after the shared event-label limit so event content cannot make one week taller than another.

Clean, organized, compact, comfortable, uncluttered — avoid both extremes: crowded/hard-to-interact-with, and so much whitespace the system feels inefficient. Use consistent spacing and alignment to show relationships between elements; group related information and visually separate unrelated information.

**Two page containers, and only two** — both are real tokens in `frontend/src/index.css`, centered in the content area:

| Token | Width | Use |
|---|---|---|
| `--container-page-wide` (`max-w-page-wide`) | 1200px | Lists, tables, reports, and dashboards |
| `--container-page-narrow` (`max-w-page-narrow`) | 832px | Single-record forms and detail views, stacked in one column |

Don't introduce a third width for one screen.

**Login layout B (Sunday, October 18, 2026 — 18:30 PHT):** Login is its own auth composition, not a shell page. It fills the viewport exactly: a full-height white (`background`) panel on the left, one third of the screen from 1024px with a `28rem` minimum (`26rem` from 768px to 1023px), holding a column up to `24rem` wide, with the blurred school photo (`LoginBackdrop`: 3px blur and a `brand-green-dark` gradient, 75% at the bottom to 20% at the top, since Monday, October 19, 2026) filling the rest. The panel is the card: no card inside it, no overlap, no shadow. Inside, one `20rem` (320px) column shares a single left edge: the lockup at the top (56px Mendez Christian Academy seal, `/MCA_Logo.png`, since Sunday, October 25, 2026 — 22:48 PHT; it has no transparent padding, so no offset, and a 12px gap before a stack of 28px bold CLINIQ in `brand-green-dark` over a 14px `text-secondary` "Mendez Christian Academy", updated Monday, October 19, 2026), the Sign In heading and form vertically centered (with a quiet `text-secondary` "Forgot password?" text link centered under the Sign In button, Zean's request of Monday, November 2, 2026, that opens a help-only dialog until the recovery method is decided). At the bottom of the panel, in 12px `text-secondary`: "[16px HealWare mark] Powered by HealWare™ · Privacy Policy · version" (order swapped and mark added Sunday, October 25, 2026) (the authorized-use line was removed at Zean's request, Monday, October 19, 2026); the Privacy Policy opens signed out, without the shell. The Password field shows a "Caps Lock is on." hint, and the lockout alert names the unlock time (Monday, October 19, 2026). Below 768px the photo becomes a 144px band on top and the panel fills the rest with 16px gutters. Demo Accounts sits at the bottom right of the photo. Login has no app footer and sets `scrollbar-gutter: auto` so no white gutter shows beside the photo; the shared footer belongs to the signed-in shell only. **Updated Thursday, November 05, 2026 — 02:58 PHT (Zean: "add a taste" to the Login layout, keeping form left and photo right):** from 768px the panel's edge flows into the photo as one gentle S-curve (`LoginSeam`, an SVG in the panel's white with a thin `brand-green-light` line tracing it), replacing the straight edge; a faint `brand-green` glow (7%) sits behind the lockup; "Use your CLINIQ account to open the clinic records." sits under the Sign In heading. Below 768px the panel rises 24px over the photo band with a rounded top (`rounded-t-3xl`), and Demo Accounts sits higher so the curve never cuts it. A frosted caption on the photo was tried and removed at Zean's request: it repeated the lockup.

### Forms
Should be especially intuitive for non-technical users. Use real labels, not placeholder-text-only. Group related fields, clearly mark required fields, explain a confusing field when necessary, and give understandable validation messages rather than exposing raw technical errors. Preserve entered data when validation fails, where possible. A user should always be able to answer: *What do I enter? → Why am I entering it? → What happens next?*

**Failed submit (Wednesday, October 14, 2026 — 17:59):** when a save fails validation, focus moves to the first invalid field, scrolled into view clear of the sticky top bar, and screen readers hear how many fields need attention. One shared hook does this on every entry and edit form. Rules: `.claude/skills/cliniq-input-patterns/`.

**Focus ring never clipped (Tuesday, October 20, 2026 — 17:42 PHT):** the one focus ring (2px outline, 2px offset, `brand-green-dark`) must show whole on all four sides. Scrolling containers keep 4px of room and scroll padding for it, keyboard focus is scrolled fully into view clear of the sticky top bar, no button spills out of its table column, and popovers close when focus leaves them. Rules: `.claude/skills/cliniq-interactive-states/` ("Room for the focus ring").

### Navigation
Predictable and simple. Familiar terminology over technical jargon. Make the current location obvious, keep important functionality easy to discover, keep recurring controls in a consistent place, and organize navigation around what the user is trying to do — not around the app's internal module structure.

**Below `lg` (agent-decided Wednesday, October 14, 2026 — 17:59, ADR-022, pending team review):** the sidebar becomes an "Open navigation" menu in the top bar listing the same role's entries plus Privacy Policy and Report an Issue; a role with no entries gets no menu button. Rules: `.claude/skills/cliniq-sidebar-patterns/`.

**Dashboard stat cards (Zean's requests, Monday, November 02, 2026 — 14:56 PHT):** the design of ADR-062 stands: tinted fill, accent left bar, corner icon, and label and figure in the meaning's text shade. On top of it: a card that opens a page takes `shadow-clickable` and on hover lifts to `shadow-overlay`, with no darker colour; a card that opens nothing sits flat. The Monthly Report's totals use the same `StatCard`. The Dashboard's attention chips take the same fills: incomplete student records white (profiles with missing details, not the pink incident records), low stock warning, expired or expiring error, with the same shadow and hover when they link. The grade-level view of Trends is rows, not a chart: each row is its filter, and its bar is the grade's share of all cases, so a few cases stay short. A split reads number first: "3 students · 2 staff".

**Back navigation (Wednesday, October 14, 2026 — 23:11, ADR-024):** every child, detail, form, flow-step, and dead-end screen has one Back control, the shared `BackButton`, first in the page content above the header card. It goes back in history, or to a fallback screen the viewer's role can open when the screen was opened directly; its text is plain "Back" unless the target is fixed ("Back to Sign In"). Quiet text style inside the App Shell, the neutral outlined button on the signed-out Privacy Policy; 44px tall on phones; never printed; also shown while the page loads. Top-level sidebar screens have none, except after a drill-through link (a Dashboard stat card or list title). On a form, Back is the same action as Cancel. Rules: `.claude/skills/cliniq-back-navigation-patterns/`.

**Page-level views (Sunday, October 18, 2026 — 13:17 PHT, ADR-032):** when a screen switches between whole views (the Dashboard's Overview / Trends), use the shared `Tabs` (`frontend/src/components/ui/Tabs.tsx`): ARIA tabs with roving tabindex, Arrow/Home/End, 44px tall on phones, selected state shown by the raised white chip, green ring, and weight (not color alone). It is one size above `SegmentedControl`, which stays for toggles inside a card (Calendar period and Calendar/Table). Keep the chosen view in the query string with `replace`.

**Trends layout (Monday, November 02, 2026 — 15:38 PHT):** Common complaints and Visits trend stay side by side in R4's order (complaints and the trend first), and the complaints card now stretches to the trend card's height, so a short list leaves no grey gap below it. A full-width strip with complaints in three columns was tried at 15:35 and dropped: the ranking read across rows, and bars in different columns could not be compared.

**Trends Sex / Grade level card (Monday, November 02, 2026 — 15:05 PHT):** Sex is one split bar over the two filter buttons: the bar gives each group's share, and the buttons give the cases and the students and staff. Female is `sex-female` `#c74375` and Male `sex-male` `#2f6aa6`, both with white text (4.68:1 and 5.63:1), and No sex recorded is `border` grey; each button repeats its colour as a swatch (15:13 PHT). The dataviz validator passes the pair, with protan separation 7.8, legal only because the words on the bar and buttons carry it too. A part under 15% drops its words. Grade level is one grey tile per enrolled grade in school order, labelled "Grade 1", with its bar on a scale that never tops out below 4 cases. An empty tile means zero, with no printed 0. School-level labels sit below, and "Select a grade to filter the charts above." sits beside the legend. Each tile is the filter; selected, it turns white with a green border (15:11 PHT). The plot is 208px tall, and the incidents line under the chart is gone (15:16 PHT). The chart fits the card at every width, with no sideways scroll; below `xl` the labels shorten to the grade number and "K". Both views use one tooltip that glides between anchors with the trend charts' `smoothTooltip` look and 320ms timing: over a grade tile's bar (cases, visits, incidents), and over a part of the sex bar from the part or its button (cases and share, students and staff, visits and incidents). It opens on hover and on keyboard focus (15:24 PHT). No separate filter buttons: they would repeat the 13 grades. Both are plain HTML, not Chart.js, so the filters stay keyboard buttons.

**Month-by-weekday chart comparison (Saturday, October 17, 2026 — 12:22 PHT):** when a dashboard range is a calendar month, compare Sunday through Saturday (ADR-055 note) to the equivalent previous-month window with grouped bars. Current is solid and previous is outlined as well as labelled, so color is not the only distinction. Keep a keyboard-focusable text table with the same totals and busiest-date/event-or-holiday context; non-month trends keep their date-derived form.

### Accessibility
Treat as part of the normal design process, not an optional pass at the end. Ensure readable text, adequate contrast, clear labels, obviously-interactive elements, understandable error messages, visible focus/interaction states, meaningful feedback, and no dependence on color alone.

### Feedback & System States
Clearly communicate what's happening: loading, saving, success, error, warning, empty data, disabled, hover, focus, and completed-action states all need a defined look (hover and cursor specifics: see Buttons, Controls & Shape Language above — this was previously stated too vaguely and got missed in the first Dashboard build). Messages should be concise and actionable — prefer "Unable to save changes. Please check the required fields." over surfacing a raw database/API error.

**Loading state, specifically — skeleton screens, on every page, not spinners and not a blank screen.** This applies universally: every screen that fetches data on load (which is most of them) shows a skeleton — gray placeholder shapes matching the final layout's structure — while that data is in flight, rather than a spinner or a blank white screen. Two reasons this is a stated rule and not a style preference:
1. **Perceived performance on the target hardware.** The Performance NFR already commits to running acceptably on a 4GB RAM machine — a skeleton makes a load that takes a beat *feel* faster than the same load behind a spinner, because the eye has structure to anticipate rather than nothing to look at.
2. **Reassurance for non-technical users.** The Usability NFR requires the system be learnable in a single training session by clinic staff who are not technical. A blank screen or a lone spinner reads as "did it freeze?" to that user in a way a skeleton — which visibly resembles the page about to appear — doesn't.

Apply this to every list, table, card grid, and detail view — not just the Dashboard (where it was first specified in `Reference-Screens.md`). A form that pre-fills from a search result should skeleton the fields being populated, not just appear blank until the fetch resolves. The one exception: a *save/submit* action's in-progress state (a button showing a spinner while a POST is in flight) is a different state than *page load* and doesn't need a full-page skeleton — that's still just a loading button, per the existing pattern in `Reference-Screens.md`.

### Modals & Confirmation
Use only when they add real value — don't interrupt users with confirmations for harmless, reversible actions. For destructive or irreversible actions: clearly explain what will happen, visually distinguish the destructive action from the cancel option, and never make a destructive and a safe action look visually identical.

**Which actions confirm.** An action that can't be undone from the screen it's on asks first: archiving a student, approving an incident report or excuse letter, marking a backup verified, and closing a follow-up as Missed or Cancelled. The expected, routine outcome doesn't: marking a follow-up Completed applies at once, because adding friction to the normal path costs the nurse time on every record. Every confirmation uses the shared `Modal`, names the record it affects, and opens with focus on the safe choice.

**Unsaved input (agent-decided Wednesday, October 14, 2026 — 17:59, ADR-021, pending team review):** Cancel on an entry or edit form asks "Discard unsaved changes?" only when something typed or chosen hasn't been saved; an untouched or just-saved form leaves at once. Rules: `.claude/skills/cliniq-modal-patterns/`.

### Animation & Microinteractions
Subtle, and only when it improves usability — communicating state changes, feedback, transitions, loading, or interaction responses. No bouncing effects, unnecessary transitions, or decorative motion. The system should feel smooth and responsive, not flashy. (This also serves the 4GB RAM performance constraint below — lightweight motion is both a UX and a hardware requirement here.)

### Consistency
Reuse established typography, font weights, spacing, colors, button styles, input styles, border radii, shadows, icons, and status/component states rather than creating a visually different one-off for a similar problem. In this stack, that means leaning on Tailwind's design tokens (spacing scale, color palette, radius scale) as the single source of truth, not ad hoc utility combinations per component.

### Labels, Titles, Dates & Times
- **Button labels are Title Case**, always: "Save Changes", "Add Item", "Mark as Verified", "Look Up Student". Short joining words (a, an, and, as, of, or, the, to) stay lowercase unless they come first. This applies to every button and every link styled as a button.
- **Page titles say what a nurse would call the screen**, in Title Case, not the internal spec label: "Visit Log" (not "Visit Log List"), "Visit Details" (not "Visit Detail/Edit"), "Incident Log", "Incomplete Records", "New Visit". The page title matches the browser-tab title.
- **One date and time format everywhere:** `Sep 27, 2026 · 9:05 AM` — short month, 12-hour clock, Philippine time. A date with no time is `Sep 27, 2026`. Never show a raw ISO string (`2026-09-27`) or a 24-hour time (`13:46`). Use `formatDateTime` and `formatDate` from `frontend/src/lib/dates.ts`; screens don't format dates themselves.
- **Never show an internal record id** (`visit-0001`, `incident-0022`) on anything a user sees or prints. Describe the record by what Staff recognise — the masked LRN and the time. A human-facing reference number for printed documents is a backend-phase item.

### Visual Hierarchy
Every page should let the user quickly answer: Where am I? What is this page for? What information matters? What actions are available? Which action is most relevant? What happened after I acted? Build this with size, weight, spacing, position, and contrast — not by making everything large, bold, or colorful.

### Implicit Decisions
Where a requirement doesn't specify behavior, use established usability judgment: clear empty states, tooltips where genuinely necessary, icon+text pairing when it helps, hover/focus/disabled/loading states, graceful error recovery, success feedback, logical grouping, responsive behavior, keyboard accessibility, and protection against accidental destructive actions. Don't add an element just because it looks good — every element needs a usability reason to exist.

### CLINIQ-Specific Implementation Notes
- Must render fast on a 4GB RAM machine — keep bundle size and animation weight modest; avoid heavy chart libraries if a lighter one covers the Clinic Overview Dashboard's needs.
- Tailwind CSS for styling; keep the palette simple and consistent across all ~35 screens.
- Print layouts (excuse letters, incident reports, monthly reports) are first-class, not an afterthought.
- **Printouts are purpose-built A4 documents (Thursday, October 15, 2026 — 23:04, ADR-026, requested by Zean):** every Print / Save as PDF is an A4 document, not the screen with its buttons hidden: a letterhead (school logo, "Mendez Christian Academy — School Clinic", the title), a plain-words scope line, content in reading order (summary, then detail, then notes), and on every page a footer with who printed it and when (Philippine time), a confidentiality line, and "Page X of Y". No app chrome. Body about 10pt, tables at least 9pt, letters and incident reports 11–12pt; header rows repeat, rows never split; correct in black and white. Multi-student printouts show masked LRNs only. Built on `frontend/src/components/print/`; see `.claude/skills/cliniq-print-patterns/`.
- The system is primarily used on the one desktop workstation; every screen still keeps a usable responsive layout down to phone width.


---

## Key Interaction Flows

## 6. Key Interaction Flows Worth Getting Right

- **New Visit → First-aid checklist:** selecting a complaint (e.g. "fainting") surfaces a standardized checklist inline, not a separate page — it should feel like part of filling the form, not an interruption.
- **Duplicate detection:** on saving a new student, if name+grade level matches an existing record, block save and show a confirmation modal rather than silently creating a duplicate.
- **Operational attention:** low-stock, expired-or-expiring, and incomplete-record counts use compact count chips on the Dashboard Overview. For Staff they link to the filtered destination; for Admin they are static counts. The Overview tab badge carries follow-up, inventory, and incomplete-record attention across Dashboard views (ADR-032).
- **Report Incident → Stage 1 save:** starting an incident should reach a savable form in as few steps as possible — only the complaint is required; the readings are optional (take what the case needs). Saving Stage 1 must succeed even if Stage 2 fields are empty; don't validate the full form up front or you defeat the point of the two-stage design.

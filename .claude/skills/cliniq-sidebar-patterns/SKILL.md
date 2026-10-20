---
name: cliniq-sidebar-patterns
description: Apply when building or changing CLINIQ's shared application sidebar or its brand lockup.
---

# CLINIQ Sidebar Patterns

## Brand lockup

- Use `/Healware_Logo.png` as the system mark in both the expanded `BrandLogo` and collapsed sidebar state. It must match the browser favicon asset declared in `frontend/index.html`.
- In the expanded sidebar, show `CLINIQ`, `Mendez Christian Academy` at 12px (`text-xs`), then `Powered by HealWare™` as a compact third line. Keep the collapse control vertically centered alongside that brand stack, not on a separate row, with clear space from the brand text: the expanded sidebar is `17rem` wide (`AppShell.tsx` grid column), because at `16rem` the collapse button touched "Academy" (2px). The attribution is readable text: `text-xs` (12px, the Design-System floor) in `text-text-secondary` (about 6.2:1 on white), never the muted token.
- In the collapsed state, show only the Healware mark: no colored tile, outer outline, box, or shadow around it.

## Implementation boundary

- The shared sidebar and `BrandLogo` live in `frontend/src/layouts/Sidebar.tsx`; update this shared source rather than recreating its brand lockup in a route.
- Keep the collapsed expand control's accessible label and existing crossfade behavior intact.
- Apply `cliniq-interactive-states` for changes to the collapse/expand control.

## Sidebar footer links

- Put legal/support destinations in a dedicated footer block after the scrollable nav groups, kept at the bottom of the sidebar without a separator line.
- Footer links are visually lightweight legal/support text rather than filled nav buttons: in the expanded sidebar, their hit area is the text itself, with a label-only underline or color shift on hover and a subtle text-only active treatment. Keep visible keyboard focus. In the collapsed sidebar, retain the 40px icon target.
- A footer item may navigate to a route or open a modal. Modal actions use a button styled with the same lightweight text treatment, expose `aria-haspopup="dialog"`, and leave the current page in place so the report keeps its context.
- In the collapsed sidebar, retain an accessible label and tooltip/title while using the existing icon treatment so the link does not become an unlabeled control.
- Put the version in a compact, non-interactive muted block within the horizontal expanded footer row after the actual footer links. In the collapsed sidebar, keep it beneath the icon actions. The version reads from the build-injected app-version constant.
- `Sidebar.tsx` owns shared footer entry points, `routes/paths.ts` owns route destinations, and the feature component owns modal content and submission behavior.

## Navigation below `lg` (phones and small tablets)

- Below `lg` the sidebar is hidden; the top bar's "Open navigation" button opens the same role's entries in the shared `Modal` (focus trap, Escape, focus returns to the button). Entries are `min-h-11` (44px) touch targets.
- The drawer ends with the sidebar footer's Privacy Policy link and Report an Issue button, so phones reach them too.

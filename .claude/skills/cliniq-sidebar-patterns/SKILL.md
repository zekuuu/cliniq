---
name: cliniq-sidebar-patterns
description: Apply when building or changing CLINIQ's shared application sidebar or its brand lockup.
---

# CLINIQ Sidebar Patterns

## Brand lockup

- Use `/MCA_Logo.png` (the school seal) as the mark in both the expanded `BrandLogo` and collapsed sidebar state: 44px (`size-11`) expanded, 40px (`size-10`) collapsed, 36px in the compact top-bar lockup. The browser favicon in `frontend/index.html` stays `/Healware_Logo.png` (the system's mark).
- In the expanded sidebar, the header shows only `CLINIQ` over `Mendez Christian Academy` at 12px (`text-xs`), so it does not look crowded. Keep the collapse control vertically centered alongside that brand stack, not on a separate row, with clear space from the brand text: the expanded sidebar is `17rem` wide (`AppShell.tsx` grid column), because at `16rem` the collapse button touched "Academy" (2px).
- The `CLINIQ` wordmark in `BrandLogo` is set in the brand font, Cinzel (`font-brand`, `tracking-wide`, bundled through `@fontsource-variable/cinzel` because the system runs on a LAN). The login wordmark and the Privacy Policy heading use it too; plain sentences that mention CLINIQ stay in Inter. Below `lg` the top-bar lockup shows the seal only, so the brand text never meets the date and time.
- `Powered by HealWare™` lives in the sidebar footer, on its own line above the footer links, with a 16px Healware mark on its left (decorative, `alt=""`). Expanded only. It is readable text: `text-xs` (12px, the Design-System floor) in `text-text-secondary` (about 6.2:1 on white), never the muted token.
- In the collapsed state, show only the MCA seal: no colored tile, outer outline, box, or shadow around it.

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

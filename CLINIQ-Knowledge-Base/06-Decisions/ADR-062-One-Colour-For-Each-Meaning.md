> **Note, Monday, November 02, 2026 — 20:54 PHT:** Zean, on the Clinic Overview printout's stock labels: "copy the inspo, not outline". On that printout only, Expired is a pale red tag with red text and Low stock or expiring a pale warning tag with warning text, with no outline, sized to the words. Point 5 below still holds on screen. Session: [2026-11-02-print-stock-tags](../08-Logs/Agent-Sessions/2026-11-02-print-stock-tags.md)

> **Note, Monday, November 02, 2026 — 14:56 PHT:** Zean: "bring back this design, this is better. because the current design doesnt match the UI style". This replaces every note below: the stat cards are back to the decision as written, with the fill, left bar, corner icon and text shades. The one addition is a stronger drop shadow and hover on clickable cards. Session: [2026-11-02-stat-cards-restored](../08-Logs/Agent-Sessions/2026-11-02-stat-cards-restored.md)

> **Note, Monday, November 02, 2026 — 15:13 PHT:** Zean: "for colors in Sex, better to apply respective color as Female and Male". Consequence 1 below is reversed: the Trends sex bar has `sex-female` `#c74375` (the old pink) and `sex-male` `#2f6aa6`, darker than the old `#3d7cbc`, which gave white text only 4.37:1. They are for that bar and its button swatches only, never for a status. Session: [2026-11-02-sex-colours](../08-Logs/Agent-Sessions/2026-11-02-sex-colours.md)

> **Note, Monday, November 02, 2026 — 06:35 PHT:** Zean: "change the icon to arrow to facing top right". The corner arrow on Dashboard stat cards is now a bare 18px `arrowUpRight`. Session: [2026-11-02-stat-cards-bare-arrow](../08-Logs/Agent-Sessions/2026-11-02-stat-cards-bare-arrow.md)

> **Note, Monday, November 02, 2026 — 06:30 PHT:** Zean: "add an indicator that it is clickable maybe an icon on the corner". Dashboard stat cards that open a page now carry a 16px `arrowRight` in the top-right corner; the notes below said no corner icon. Session: [2026-11-02-stat-cards-arrow](../08-Logs/Agent-Sessions/2026-11-02-stat-cards-arrow.md)

> **Note, Monday, November 02, 2026 — 06:27 PHT:** Zean: "the cards aren't kinda visible" and "the outline style looks cheap and kinda doesnt match the UI of overall". Dashboard stat cards no longer use the pale fills of item 1. They use the accent itself at 35% (yellow 60%) with the usual card shadow and no outline, and all their text is `text-primary` (at least 9.37:1). The fill tokens stay for badges and other uses. Session: [2026-11-02-stat-cards-stronger-tint](../08-Logs/Agent-Sessions/2026-11-02-stat-cards-stronger-tint.md)

> **Note, Monday, November 02, 2026 — 06:22 PHT:** Zean: "We want the color on the card not hyperlinked text" and "audit the icon and underlined texts, because it seems like only the texts is the clickable". This replaces the note below. Dashboard stat cards keep the tinted fill of item 1, as separate cards. Label and figure are `text-primary`. There is no left bar, corner icon, link icon or underline; the whole card answers the hover. Session: [2026-11-02-stat-cards-colour-on-card](../08-Logs/Agent-Sessions/2026-11-02-stat-cards-colour-on-card.md)

> **Note, Monday, November 02, 2026 — 06:13 PHT:** Zean: "Also this cards looks ai slop, redesign it." The Dashboard stat cards no longer use the tinted fill, the left bar or the corner icon of items 1 and 7. Each card is plain type on one white strip: its label keeps the text shade, and a figure above zero takes it only on the action cards. Accents, fills and badges elsewhere are unchanged. Session: [2026-11-02-stat-cards-as-type](../08-Logs/Agent-Sessions/2026-11-02-stat-cards-as-type.md)

# ADR-062: One colour for each meaning, with a darker shade for text

**Date:** Sunday, November 1, 2026 — 22:36 PHT
**Status:** Accepted (Zean, in the question pop-up of the frontend review round 2 prompt, Part 1).

## Context
A groupmate's frontend review (4 pages, Monday, November 2, 2026) proposed a palette: a colour for each meaning on the Dashboard cards and statuses. She also found the warning colour brown, incidents grey in the Trends chart, and Expired looking like Low stock. Her pale text colours fail contrast: yellow on cream is 1.4:1, green on mint 2.0:1, orange on beige 2.3:1, pink 2.8:1 and purple 3.0:1. The Design System needs 4.5:1 for text.

## Decision
1. Each meaning has an accent (left bar, border, chart), a fill, and a darker text shade. `Design-System.md`, "Semantic colours by meaning", holds the table.
2. **Icons use the text shade, not the accent.** This differs from the prompt's table. Her accents cannot carry an icon on their own fill: the yellow is 1.42:1 and the orange 2.29:1, and a meaningful icon needs 3:1.
3. `warning` is now `#E9882F`. It never carries text. Solid warning takes `text-primary` (6.65:1), and words use `warning-text` `#9A4A00`. The old `#A85F00` and `warning-light` are gone.
4. Complete is green, resolved and resting are blue, an unfinished incident record is pink, and a pending excuse letter is yellow.
5. Low stock takes the warning style and Expired the solid red style, so the two no longer look alike.
6. Grade-level incidents are red in Trends, reversing the October 25 move to the neutral. The limit of four hues now applies to one chart, not one screen.
7. Colour never carries the meaning alone: the icon and the words stay.

## Alternatives Considered
- **Keep today's palette and fix only the three clear mistakes.** Not chosen by Zean.
- **Her palette with her pale text.** Fails contrast.

## Consequences
- The by-sex chart stopped using `chart-female` and `chart-male` (ADR-063), so both tokens are removed.
- `Frontend Context Brief` and `Frontend Design Reference` still show the old warning colour (open `DOC`).
- Session: [2026-11-01-frontend-review-round-2-part-1](../08-Logs/Agent-Sessions/2026-11-01-frontend-review-round-2-part-1.md)

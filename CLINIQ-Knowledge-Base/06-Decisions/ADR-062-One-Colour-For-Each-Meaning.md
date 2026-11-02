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

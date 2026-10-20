---
name: cliniq-page-header-patterns
description: Apply when building or changing a CLINIQ screen's top-of-page heading and its actions. Keeps page context concise by removing passive badges that merely repeat the page title or a filter's unbounded scope.
---

# CLINIQ Page Header Patterns

Use this with `cliniq-interactive-states` for actions and `cliniq-back-navigation-patterns` when the screen needs a Back control.

## Context, filters, and badges

- Do not place a passive `Badge` in a page header solely to repeat the page title or an obvious unbounded list scope. For example, a Visit Log does not need an `All visits` badge and an Incident Log does not need an `All incidents` badge.
- Keep the actual filter control visible and functional. It is the source of truth for the selected scope, including a custom date range.
- Retain header or card badges only when they communicate a meaningful state that the title and controls do not already establish, such as an archived record, a pending approval, a selected role, or a safety status.
- Keep the page title, concise purpose description, and primary action in the header; do not remove meaningful actions to make the header quieter.

There is no shared page-header component today. Apply these rules locally until repetition justifies one.

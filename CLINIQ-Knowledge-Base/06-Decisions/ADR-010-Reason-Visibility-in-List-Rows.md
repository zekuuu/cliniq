# ADR-010: Reason/Description Visible in Multi-Student List Rows (Option A)

**Date:** Saturday, September 26, 2026 — 20:43
**Status:** Accepted. **Amended by ADR-027 and ADR-028 (decided Saturday, October 17, 2026 — 07:52, not built):** list rows show the masked LRN in place of the Student Number (built Wednesday, October 21, 2026 — 07:00, [2026-10-21-lrn-replaces-student-number](../08-Logs/Agent-Sessions/2026-10-21-lrn-replaces-student-number.md)); the reason/description rule here is unchanged.

## Context
ADR-004's display-privacy rule only covers **names**: multi-student, glanceable lists show the Student Number instead of the full name. The reference-mockup audit (`03-Design/Design-Audit-Reference-Mockup.md`, "Worth deciding now") raised a question the rule never answered: should a visit's complaint, an incident's description, or a follow-up's reason also be hidden or genericized in those same list rows? A Student Number is still identifiable to anyone who can connect it to a person. The question was deliberately left open with three options (A, B, C), and `.claude/skills/cliniq-display-privacy/` told agents to stop and ask rather than pick one.

It came to a head while building the Clinic Overview Dashboard. `03-Design/Reference-Screens.md` (Reference 1) explicitly specifies due/upcoming follow-up rows as "student number, **reason**, due date, status badge", which contradicts the still-open question.

## Decision
**Option A.** In multi-student list views, the reason/complaint/description **stays visible** next to the Student Number. Removing the name is enough de-identification for a casual glance. The name rule itself (ADR-004) is unchanged: lists show the Student Number, never the name.

Chosen by the project owner when asked directly during the Dashboard build (Saturday, September 26, 2026).

## Alternatives Considered
- **Option B:** genericize the reason in ambient list views (e.g. "Visit" or "Follow-up"), with full detail only on the opened record. Stronger privacy, but the nurse loses the at-a-glance information that makes the Dashboard's alert list useful ("which follow-up is this?").
- **Option C:** show reasons for routine visits but hide incident descriptions, since incidents are the more sensitive category. Not chosen; one consistent rule is simpler to apply and review.
- **Dashboard-only Option B, leaving the system-wide question open.** Offered and not chosen.

## Consequences
- Applies system-wide, to every list screen that follows the Reference 1 list-row pattern: the Dashboard alert lists, Visit Log List (#10), Incident Log List (#15), and Follow-Up List (#18c). The mockup's reason/description columns in the Visits List and Incident Log are therefore acceptable as drawn.
- Names are still never shown in these lists. That part of ADR-004 is untouched.
- **Implementation note, Wednesday, September 30, 2026 — 22:52:** the Visit Log List (#10) had been built showing a generic "Visit recorded" with a test asserting no complaint column, contrary to this ADR. The project owner confirmed this ADR stands; the Visit Log now shows the complaint beside the Student Number and the test asserts that.
- `.claude/skills/cliniq-display-privacy/SKILL.md` and `03-Design/Design-Audit-Reference-Mockup.md` were updated so they no longer describe this as open.
- **Canonical documents need a matching update** (per AGENTS.md "After you finish" step 5): the display-privacy rule text in *CLINIQ Modules & Features* and the *Frontend Context Brief* §3 should gain a sentence saying reasons/descriptions stay visible in list rows. Until then, this ADR is the authority (Source-of-Truth hierarchy, level 2).

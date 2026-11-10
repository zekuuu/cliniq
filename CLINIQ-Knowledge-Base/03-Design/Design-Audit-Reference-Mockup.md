# Design Audit — Reference Mockup (ChatGPT-Generated, September 24, 2026)

An honest audit of the 12-screen reference image against everything already decided in the Project Plan, Modules & Features, Frontend Context Brief, and Frontend Design Reference. Organized by severity. The mockup is a useful starting point and gets the broad shape right, but several already-confirmed requirements are missing or contradicted — this is worth fixing before treating it as "the design," not after.

**Status:** the image is a *reference*, explicitly changeable per the request that produced it. Nothing here is final — this is the audit that should inform the revision.

**Image asset:** `03-Design/assets/reference-mockup.png` — the actual file, saved so any agent can view it directly rather than working from this description alone. **How to use it while building:** `04-Development/Frontend-Loop-Engineering.md` — layout/density reference only, filtered through the corrections below, never colors or the gaps identified here.

---

## Critical — contradicts or omits a confirmed requirement

### 1. Visit and Incident appear merged into one form with a "Type" dropdown
The **New Visit** screen shows a "Type" field (Visit selected) implying Incident is just another option in the same form. This works against the entire reason the two-stage incident flow exists: Emergency Response was deliberately designed as a **separate, faster path** — Stage 1 captures only complaint + immediate vitals and saves instantly, specifically so speed is never traded for a full form (Modules & Features, Module 4; ADR-003 in the vault). If reaching "Incident" mode means first opening the same form as a routine visit and then picking a type from a dropdown, that reintroduces exactly the friction the two-stage design exists to avoid. Visit and Incident need to stay visually and functionally distinct entry points, not one form with a type selector.

### 2. No Follow-Up Handling anywhere
Follow-Up Handling — the inline "does this student need a follow-up?" prompt, the Pending/Completed/Missed/Cancelled status, and the due/upcoming list that serves as the system's internal reminder (since there's no external SMS/push) — is a confirmed requirement (Project Plan Revision 2.0) and doesn't appear in any of the 12 screens: not in New Visit, not on either Dashboard, not as its own list view. This isn't a minor omission; it's one of the more recent and deliberately-designed features, added specifically to solve a real workflow gap (a student told to come back tomorrow, with no way to be reminded of that except a sticky note).

### 3. No calendar view on either Dashboard
The Clinic Overview Dashboard's calendar — toggleable weekly/monthly/yearly, showing visit/incident counts with lightweight event tagging — is a confirmed, named Dashboard element (Modules & Features, Module 9) and isn't present on the Staff or Admin Dashboard screens shown. Possible this simply wasn't included in this particular crop, but if it's absent from the actual design, it needs to be added, not treated as optional.

### 4. No two-stage status indicator on the Incident Log
Incidents can be Stage 1 (fast-capture, incomplete) or fully complete — the Incident Log List is specifically supposed to surface which is which (Modules & Features, Module 4: "including which are still in Stage 1 vs fully completed"). The mockup's Incident Log has Type and Description columns but no completion-status badge. Without it, staff have no way to see at a glance which incidents still need finishing.

### 5. No Emergency button shown for Staff's mobile flow
Only the Instructor's read-only mobile lookup is shown. The Staff mobile experience — which should include a separate, urgency-styled **Emergency button** distinct from the normal action grid (Frontend Design Reference, Reference Screen 4) — isn't represented at all in this set. Likely just not included in this particular crop rather than designed out, but worth confirming it exists, since it's one of the more safety-relevant pieces of the whole system.

---

## Worth deciding now — a real display-privacy question this mockup surfaces

Our existing display-privacy rule (ADR-004) only covers **names**: multi-student list views show Student Number, not the name. The mockup follows that correctly everywhere checked — Recent Visits, the Visits List, and the Incident Log all show Student Number, not a name, in list rows.

But the mockup also puts the **complaint/reason directly in those same list rows** — "Headache," "Stomachache," "Arm injury," and, more pointedly, incident descriptions like "Allergic reaction" and "Fainted during assembly" sitting right in a glanceable table. Our rule never actually addressed this, because it wasn't the question at the time — but the underlying concern (a bystander glancing at a screen and inferring something about a specific, identifiable student) applies just as much to "2024-0067 — Fainted during assembly" as it does to a name. A Student Number is still a specific individual to anyone who can connect it to a person — a classmate, a sibling, someone who saw it on a printed ID.

This needs an actual decision, not a guess on my part:
- **Option A:** keep reasons/descriptions visible in list views as shown — accept that the identifier already provides meaningful de-identification for a casual glance. (This audit predates ADR-027 and ADR-028: the Student Number was replaced by the masked LRN.)
- **Option B:** truncate or genericize the reason column in ambient list views (e.g., "Visit" instead of the specific complaint), full detail only on the opened record — extending the existing rule's logic rather than introducing a new one.
- **Option C:** something in between (show reason only for Incidents, not routine Visits, since incidents are the more sensitive category).

## Visual/brand fidelity gaps

- **The MCA gold/yellow doesn't appear anywhere.** The actual sampled brand colors (Frontend Context Brief, Section 7) are a vivid green (`#039935`) *paired with* a strong gold/yellow (`#EAEA09`) — that pairing is the whole identity, visible in both the school's logo and the poster. This mockup is monochromatic green, white, and gray. It reads as a generic soft-SaaS dashboard rather than something built from MCA's actual crest.
- **The green itself doesn't match what was sampled.** The mockup uses one soft, desaturated sage/mint green throughout — sidebar, buttons, chart lines, badges. The real sampled `brand-green` is more saturated and vivid than what's shown here.
- **No semantic color differentiation visible.** One of the more deliberate decisions already made (ADR-007's color-token work) was making sure "success" and "primary brand action" use different-enough shades that a completed action and a clickable button never look identical. Everything in this mockup appears to use the same green for both roles — primary buttons and status badges alike.
- **Badges do include text labels alongside color** (Complete/Incomplete, Sufficient/Low Stock), which is the right instinct — satisfies "never rely on color alone" at a basic level. Worth double-checking in the real build whether an icon is paired too, per the fuller accessibility guidance, since that's hard to verify from a static image at this resolution.

## What the mockup gets right — worth keeping

- **Role-based navigation is correctly differentiated.** The Admin Dashboard's sidebar shows only Dashboard and Reports — exactly matching Admin/Principal's read-only, reports-and-dashboard-only scope. Staff's sidebar shows the full module list. This is a real, correct implementation of the RBAC design, not just a cosmetic difference.
- **The masterlist (Student List) correctly shows full names** — consistent with the display-privacy rule, since a roster of enrolled students isn't the same risk as a visit/incident pattern.
- **The Student Profile screen correctly shows a full name** — a deliberately-opened single record, exactly the case where the rule says full name is fine.
- **The Instructor mobile lookup concept is well-aligned** — scan-or-enter-number, read-only, matches the intended flow closely.
- **Stat cards and the general dashboard shape** (counts, low-stock/expiring alerts, a trends chart) track the Clinic Overview Dashboard's requirements reasonably well, calendar view aside.

## Recommendation

Treat this as a strong starting skeleton for layout and information density, not as the finished design. Before building against it: resolve the Visit/Incident merge (item 1), add Follow-Up Handling and the calendar view (items 2–3), decide the reason/description visibility question above, and rebuild the color application around the actual sampled brand tokens rather than a generic soft green. None of this is a redesign from scratch — the bones (nav structure, role differences, general layout density) are sound.

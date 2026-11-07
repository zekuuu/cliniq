# ADR-071: Suggested medicines come from "Commonly used for" tags on each item, never hide or block

**Date:** Saturday, November 07, 2026 — 05:13 PHT
**Status:** Accepted (Zean, in chat, Saturday, November 7, 2026 — 04:18 PHT: "suggested first, with 'Show all medicines'", the suggestions coming from tags the nurse sets on each item). Relates to ADR-018 (stock rules) and ADR-049 (allergy warnings, no medicine-to-allergen map). **Built** Saturday, November 07, 2026 — 05:13 PHT ([session](../08-Logs/Agent-Sessions/2026-11-07-consultation-part-1-symptoms-released-to-suggested-medicines.md)).

## Context
The professor's consultation (Friday, November 6, 2026) asked that the Visit form help the nurse find the usual medicine for what the student feels. CLINIQ has no drug data, and ADR-049 rejected a medicine-to-allergen map because the nurse would have to maintain it and dispensing is her professional decision.

## Decision
1. Each inventory item gets an optional **"Commonly used for"** list (`usedFor: string[]`): one or more of the Visit form's symptom options (the visit complaint-type labels, which serve as the option ids). Staff set it on the item's Add/Edit form with checkboxes. It is stored in the list's order and audited **by field name only** ("Updated commonly used for"). A save that leaves the field out keeps the existing tags.
2. On the Visit form's medicine picker (New Visit and the Visit Details edit form):
   - with no symptom chosen, every item is listed as before;
   - with symptoms chosen, matching items come first under **"Suggested for these symptoms"**, with the note "Suggestions come from the tags set on each item. The clinician decides." The rest sit behind a **"Show all medicines"** row, collapsed by default, that a click or Enter opens;
   - **typing always searches every item**, so nothing is hidden from search. Nothing is disabled, excluded or blocked by a suggestion. Stock, expiry, batch and "avoid if allergic to" warnings work exactly as before, on suggested and other items alike.
3. The seed carries **starter tags on three demo items** (paracetamol: Headache, Fever; mefenamic acid: Menstrual cramps, Toothache; loperamide: Stomachache), each marked "starter tags, to be confirmed by the clinician". The nurse sets the real tags.
4. No medical claim beyond the tags, no severity or pain field, and no rule that changes a dispensing decision.

## Alternatives Considered
- **A built-in symptom-to-medicine table.** Rejected for the same reason as ADR-049's allergen map: someone must maintain it, and it would read as a clinical recommendation.
- **Show only the suggested medicines.** Rejected: a medicine must never be hidden; the nurse decides.
- **A brand-name field (for example "Biogesic" under paracetamol).** Not built: items carry only a generic or branded flag. Left as a question for the team.

## Consequences
- `inventory_items.usedFor` (tag ids) is a new optional field the ERD and API must carry; Staff edit it, as with "avoid if allergic to". The backend branch copies this.
- An "LBM" symptom does not exist in the option list; loperamide is tagged "Stomachache" until the list changes.
- Suggestions are only as good as the tags the nurse sets.

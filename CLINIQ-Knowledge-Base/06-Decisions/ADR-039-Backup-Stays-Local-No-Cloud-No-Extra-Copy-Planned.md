# ADR-039: Backup stays on the internal and external drives, with no cloud and no extra copy planned yet

**Date:** Sunday, October 25, 2026 — 16:58 PHT
**Status:** Accepted (Zean, Sunday, October 25, 2026 — 16:45, corrected at 16:57). Nothing to build.

## Context
The backup plan is the app's backup on the clinic computer and an external drive. The panel review (BK-1) said one drive plugged into the same computer is exposed to fire, theft, power surges and ransomware, and the question of an additional layer was open. Sir Mina asked where the backup goes. Sir Rey said a cloud backup should already exist ("dapat meron na"). ADR-029 decided CLINIQ runs locally; the school has no IT staff and the Principal's network is separate from the clinic's.

Zean first agreed (16:45) to "local only, with a copy held by the Principal, and no cloud". At 16:57 he withdrew the Principal's copy: there is no plan for any extra copy yet, only the internal and external drive.

## Decision
1. **The backup stays as it is:** the app's backup on the clinic computer and the external drive, with "Back up now" and the 48-hour alert (ADR-037).
2. **No cloud or online backup.** Children's health data stored off-site needs the parents' consent and a written agreement with the provider under the Data Privacy Act (RA 10173), the clinic has nobody to run it, and ADR-029 chose a local system. Revisit only if the school goes online (ADR-029 names that as a future option).
3. **No second or off-site copy is planned yet.** A copy held by the Principal, encryption and a custody procedure were suggested and are **not** decided. The open `DECIDE` "Additional backup layer beyond local + external drive" stays open; only the cloud option is ruled out.

## Alternatives Considered
- **Cloud backup (Sir Rey).** Rejected for now (item 2).
- **A second encrypted copy held by the Principal.** Suggested by Claude and first accepted, then withdrawn by Zean; not planned.

## Consequences
- For the defense: the answer to "why no cloud" is item 2; the honest answer to "what if the computer is lost" is that the external drive is the only other copy, and that an extra layer is an open question.
- The `LATER` "Backend: backup checksum, automatic test restore and a second copy" is unchanged.
- Session: [2026-10-25-mina-rey-feedback-triage-and-build-prompt](../08-Logs/Agent-Sessions/2026-10-25-mina-rey-feedback-triage-and-build-prompt.md)

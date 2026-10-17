# ADR-029: Roles Under a Local Deployment: No Direct PE Instructor Access, Principal Signs In at the Clinic Computer

**Date:** Saturday, October 17, 2026 — 07:52
**Status:** Accepted (the team meeting of Friday, October 16, 2026, 7:00 PM; recorded only: **nothing is built yet**; the client has not been asked, see Consequences) Context corrected Saturday, October 17, 2026 — 10:52: the Principal's office has Wi-Fi, on a different network from the clinic's.

## Context
CLINIQ will run locally. The Principal's office has Wi-Fi, but it is a different network from the clinic's, so the Principal cannot reach a system that runs only on the clinic's local network (Zean, Saturday, October 17, 2026 — 10:52; an earlier version of this ADR said the office had no Wi-Fi, which was wrong). The PE/Sports Instructor cannot reach a system on the clinic's network from outside it either. With the QR feature dropped (ADR-027), the Instructor's only screen is gone as well. The professor had advised keeping the scope to the main functions, asking the Principal what he actually needs (the professor expected the printed monthly report), and asking before adding features.

## Decision
1. **The PE/Sports Instructor has no direct system access.** An instructor asks the clinician, who picks the students and prints their health information and recent incidents.
2. **The Principal/Admin keeps an account and signs in on the clinic's local computer** to read the Dashboard and the printable report. Access from the Principal's own office is a future option only if the school connects the two networks or goes online.
3. **Working rule for emergencies:** help the patient first, use paper at the time, and enter the record in the system afterwards. The system is for tracking and incident summaries, not for running an emergency.

**Not decided here** (open `DECIDE` entries): what the instructor's printout contains and how the clinician builds it; whether the phone Emergency button stays; how the Principal's account is handled on a shared clinic computer; who manages accounts if the admin is absent.

## Alternatives Considered
- **Keep phone access for instructors.** Needs the phones to reach the clinic computer on the school network, which the team does not control.
- **Remote access for the Principal.** Needs the Principal's Wi-Fi and the clinic's network to reach each other (or the school to go online), and the school's computer manager to allow it; it also widens who can reach a system that holds children's health data. Kept as a future option.
- **Drop the Admin/Principal role too.** Rejected: the Principal still needs the Dashboard and the report; only the way the Principal reaches them changes.

## Consequences
- **ADR-003 is superseded** (the Instructor role). ADR-022 (shell navigation on phones) and ADR-023 (already superseded by ADR-027) need a read-through when this is built; ADR-025 (Dashboard views) and ADR-026 (printouts) stay, and ADR-026 gains one document, the instructor's health printout, once its contents are decided.
- **Not yet checked with the client.** The two questions to ask are who provides the computer and whether the school will go online, and the team plans to ask the IT person and the Principal together. The professor's rule is that the team does not guess: if the Principal needs more than a local sign-in, this ADR changes.
- **What the Principal said at the earlier meeting (around October 14), recorded afterwards:** he suggested the team supply a computer "connected to the internet", asked for a plan for power and internet loss, wants individual accounts (also for a substitute clinician), and described his need as watching visit counts and hearing about incidents; he saw the PE instructor role without objecting, before the team decided to drop its direct access. So "local only" is the team's choice, the Principal's office Wi-Fi is a separate network from the clinic's (so he cannot reach the system today), whether the two networks can be connected is open, whether the clinic itself has internet is not known, and the instructor's real need (do not let an injured student play) is about same-day injuries, which a printout does not cover. These are open `DECIDE`s in Issues-and-TODOs.md, section "Meeting with the Principal and the clinic".
- **Shared-computer risk.** A Principal signing in on the clinic computer means more than one person on one machine: sign-out, session timeout and the audit trail matter more. Printing health information for an instructor sends it out of the clinic, so what the printout holds should be the minimum.
- **The team's doubts, recorded:** whether the system is faster than the manual way in a real emergency, what happens if the system fails during one, and that the clinicians' real emergency process has not been seen or asked about.
- **The app still has the Instructor role** until the removal is built; ADR-027's instruction that agents do not change code until asked applies here too.

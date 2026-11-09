# ADR-079: CLINIQ is deployed on the clinic PC only; the Principal gets a monthly PDF

**Date:** Monday, November 09, 2026 — 18:08 PHT
**Status:** Accepted (Zean, in chat, Sunday, November 8, 2026, about 18:03 to 18:10 PHT, simulating the finished system on the clinic's computer). It reinforces ADR-029 (local only, offline) and replaces its note of Saturday, October 31, 2026, which said other devices on the clinic's network could reach CLINIQ. It goes with ADR-078 (the idle sign-out for a shared, unlocked room). Written in Part 2 of `Prompt-Frontend-Staff-Idle-Signout-And-Clinic-Only-Nov8.md` ([session](../08-Logs/Agent-Sessions/2026-11-09-clinic-pc-only-part-2.md)).

## Context
The Principal's office is on a different network from the clinic's Wi-Fi (known since Saturday, October 17, 2026). The school will provide a computer, not a server. The Principal does not need to sign in to read the month's figures if the clinician sends the Monthly Report. The clinic room is not locked, and other people use the PC when the clinician is away.

## Decision
1. **CLINIQ runs on the clinic PC only, at `http://localhost`.** No other computer reaches it:
   - **Network:** no LAN access, no fixed IP address, no hostname, no router entries, and nothing forwarded from the router to the internet.
   - **Firewall:** Windows Firewall blocks inbound connections to the web server.
2. **No HTTPS.** Traffic never leaves the machine, and browsers treat `localhost` as a secure context, so no certificate is needed.
3. **The Principal receives the Monthly Report as a PDF.** The clinician prints it or chooses Save as PDF in the browser's print window. The Reports screen says so ("To send this to the Principal, print it or choose Save as PDF in the print window."). While printing, the tab title, which the browser offers as the file name, is "CLINIQ Monthly Report, <Month Year>". Incident reports are already printed and signed (ADR-053, ADR-060).
4. **The Admin account is used on the clinic PC**, for example with the Principal present. It reads the reports on screen and does not print (ADR-038, ADR-077).
5. **Deployment requirements for a shared, unlocked room:**
   - a Windows sign-in password, and a screen lock after 5 to 10 minutes;
   - BitLocker disk encryption if the PC runs Windows Pro;
   - backups stored away from the room, on a second drive or a USB drive kept elsewhere. A backup only on the clinic PC's own disk is not enough;
   - one Staff account per covering person, never shared (ADR-078).
6. **What would reopen this.** If the school later puts the PC on the main school network, LAN access, a hostname and HTTPS become a new decision. The values that would change (the address, CORS and Sanctum domains, the cookie's `secure` flag) are environment settings, not code.

## Alternatives Considered
- **LAN access for other PCs.** Rejected: the Principal's office is a different network, and opening the PC to the clinic's Wi-Fi widens who can reach children's health records.
- **Online hosting.** Rejected: the data would leave the school, which needs a privacy review and costs money (ADR-029, ADR-039).
- **A second, synchronised copy for the Principal.** Rejected: two copies of health records to secure and keep in step, for a monthly summary a PDF already gives.

## Consequences
- The Privacy Policy now says the system runs only on the clinic's computer and is not reachable from other computers or the internet.
- Documents that said "served over the LAN" were reworded (session log table). Dated logs keep their wording.
- Backend-owned documents follow on the `backend` branch: the readiness checklist's "HTTPS on the LAN" item, the environment setup, and the CORS and Sanctum defaults. See "For the backend branch" in the session log.
- Canonical documents (Project Plan, Frontend Context Brief, Review of Related Systems) were updated in the same run (Project Plan revision 3.0).

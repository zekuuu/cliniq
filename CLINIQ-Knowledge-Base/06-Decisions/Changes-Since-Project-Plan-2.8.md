# What changed since Project Plan revision 2.8

Written Tuesday, November 10, 2026 — 17:27 PHT for the team writing the SRS and the final Project Plan. Revision 2.8 (Friday, October 30, 2026) carried ADR-001 to ADR-053. This page lists everything decided or built after it, ADR-054 to ADR-079, grouped by area, from [Decisions-Summary.md](Decisions-Summary.md) and the changelogs. Each line names its ADR; read the ADR before quoting it. The Project Plan has since reached revision 3.1 (revisions 2.9, 3.0 and 3.1 carry part of this); the [canonical documents](../09-References/Canonical-Documents/) and the [requirements](../01-Requirements/Functional-Requirements.md) carry all of it.

## Deployment and security

- CLINIQ runs on the clinic PC only, at `http://localhost`: no LAN, no hostname, no HTTPS; inbound connections blocked. The Admin account is used on the clinic PC; the Principal gets the Monthly Report as a PDF. The unlocked room needs a Windows password and screen lock, BitLocker on Windows Pro, backups kept away from the room, one Staff account per person. [ADR-079](ADR-079-Clinic-PC-Only-Principal-Gets-Monthly-PDF.md)
- The session ends 7 days after sign-in, however active the user is. [ADR-057](ADR-057-Backend-Answers-Fixed-Session-Retention-And-ERD-Approval.md)
- Both roles are signed out after idle time: Staff 60, Admin 30 minutes by default, each a setting of 10 to 240 on a new Settings page, with a 2-minute warning. [ADR-078](ADR-078-Staff-Idle-Signout-Idle-Times-Are-Settings.md)
- Lock-out after 5 wrong passwords is 5 minutes (was 30). ADR-015, amended Sunday, November 8, 2026.
- Password recovery uses an authenticator app (6-digit code or 8 recovery codes); the email reset of ADR-048 is gone, and accounts have no email address. [ADR-073](ADR-073-Password-Recovery-With-An-Authenticator-App.md)
- Every user edits their own name, picture and password from an account menu. [ADR-066](ADR-066-Account-Menu-And-Own-Profile.md)

## Backend and data

- Backend: Laravel with Sanctum in SPA cookie mode, built on its own `backend` branch, not wired to the frontend yet. [ADR-056](ADR-056-Backend-Preparation-Sanctum-SPA-Cookie-Mode-Own-Branch-Nothing-Wired-No-Migrations-Before-ERD-Approval.md)
- The ERD, Data Dictionary and Reference Schema are approved (48 tables today); the audit log stores the actor's role; staff-patient records kept 5 years and the audit log 10 years, settled. [ADR-057](ADR-057-Backend-Answers-Fixed-Session-Retention-And-ERD-Approval.md), [ADR-076](ADR-076-Staff-Record-Reviews-In-Their-Own-Table.md)
- Names are stored as first, last and optional middle name. [ADR-064](ADR-064-Names-Stored-As-First-Last-And-Middle-Name.md)
- A name correction's reason goes in the audit log, never the names. [ADR-058](ADR-058-Name-Correction-Reason-In-The-Audit-Log.md)

## Students and staff

- The student's own phone number is dropped; an optional birthdate is added; the age group follows the age. [ADR-054](ADR-054-Student-Own-Number-Dropped-Birthdate-Added-Age-Group-By-Age.md)
- A student's emergency contact is optional at saving (the record stays Incomplete). [ADR-059](ADR-059-Student-Emergency-Contact-Optional-At-Saving.md)
- Staff patients record sex and count in the by-sex totals. [ADR-063](ADR-063-Staff-Patients-Record-Sex.md)
- Staff records have a record status and their own Incomplete Records page; staff can be imported from a CSV, adding and updating only. [ADR-067](ADR-067-Staff-Record-Status-And-Incomplete-Filter.md), [ADR-069](ADR-069-Staff-List-Import.md)
- One Archive page by school year; the school year (June 15 to April 14 by default) is a setting, and Staff end and start each year by hand. [ADR-072](ADR-072-Archive-By-School-Year.md), [ADR-075](ADR-075-School-Year-Started-By-Hand.md)

## Visits, incidents and inventory

- "Complaint" reads Symptoms and "Collected by" reads Released to on every screen (labels only). [ADR-070](ADR-070-Consultation-Wording-Dashboard-Print-Moves-To-Reports.md)
- Suggested medicines come from "Commonly used for" tags on each item. [ADR-071](ADR-071-Suggested-Medicines-From-Item-Tags.md)
- Everything on Incident Stage 2 is optional. [ADR-065](ADR-065-Incident-Stage-2-Care-Is-Optional.md)
- A large stock write-off is flagged in the audit log; the note is optional. [ADR-061](ADR-061-Large-Stock-Write-Off-Needs-A-Written-Note.md), [ADR-068](ADR-068-Adjust-Stock-Note-Is-Optional.md)

## Reports and the Admin

- The Principal signs the printed incident report; there is no on-screen Acknowledge. [ADR-060](ADR-060-Principal-Signs-The-Printed-Report-No-On-Screen-Acknowledge.md)
- The Monthly Report's weeks run Sunday to Saturday. [ADR-055](ADR-055-Monthly-Report-Weeks-Run-Sunday-To-Saturday.md)
- No Clinic Overview printout; the Dashboard prints nothing. Reports has four: Monthly Report, Incident register, Symptom summary, Inventory sheet. [ADR-074](ADR-074-No-Clinic-Overview-Printout.md)
- The Admin's Reports page is a month drop-down with the four monthly reports, view only. [ADR-077](ADR-077-Admin-Reports-Month-List-View-Only.md)

## Look and feel

- One colour for each meaning, with a darker shade for text. [ADR-062](ADR-062-One-Colour-For-Each-Meaning.md)

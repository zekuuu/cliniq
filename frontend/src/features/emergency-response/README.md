# Emergency Response

## What it is
The two-stage (fast-capture then complete-later) incident flow, hospital referral, parent-notification log, and Follow-Up Handling (shared with clinic-visits).

## Screens and who can use them
- Incident Log and Incident Report: School Clinician and Admin / Principal. The Admin / Principal reads only, can Acknowledge an approved report (ADR-048), and each report opened is audit-logged once per session (ADR-038, ADR-048).
- Report Incident (Stage 1 and Stage 2), Emergency Contact Notification Log, Follow-Ups: School Clinician only.

## Rules that matter
- Visits and incidents stay separate; an incident can be escalated from a visit (`?fromVisit=`, ADR-036).
- Readings are taken as the case needs ("don't force all 4"): temperature, pulse, blood pressure and oximeter (`oxygenSaturationPct`, whole percent 0 to 100) are all optional at both stages, in that order; only the complaint is required at Stage 1. Only the readings taken are stored and shown; with none, views say "No readings taken". Temperature and pulse keep the non-blocking unusual-value warning (`lib/vitals.ts`); the oximeter has none until the clinician gives a range (`config.vitalsWarningRanges.oxygenSaturationPct`, `null` for now).
- An incident can be about a student or a staff patient (ADR-043), and keeps the grade it had when saved (`gradeLevelAtTime`, and `sectionAtTime` when there is one, ADR-047).
- A pending follow-up is Overdue after 3 days and closes as Missed after 7 (ADR-051).

## Data and API files
`api/incidentEntryApi.ts`, `api/incidentLogApi.ts`, `api/incidentRecordApi.ts`, `api/followUpApi.ts`; outcomes in `notificationOutcomes.ts`.

## Printouts and tests
The Incident Report prints as a formal A4 document with vitals, treatment, referral, who recorded and approved it, and signature lines; a Stage 1 record prints "Not yet completed" (ADR-026). Tests: the `*.test.tsx` files in this folder.

## Not built yet
Nothing decided is waiting here.

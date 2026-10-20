Emergency Response — the two-stage (fast-capture then complete-later) incident flow, hospital referral, parent-notification log, and Follow-Up Handling (shared with clinic-visits).

The Incident Report prints as a formal A4 document with vitals, treatment, referral, who recorded and approved it, and signature lines; a Stage 1 record prints "Not yet completed" (ADR-026).

Readings are taken as the case needs ("don't force all 4"): temperature, pulse, blood pressure and oximeter (`oxygenSaturationPct`, whole percent 0 to 100) are all optional at both stages, in that order; only the complaint is required at Stage 1. Only the readings taken are stored and shown; with none, views say "No readings taken". Temperature and pulse keep the non-blocking unusual-value warning (`lib/vitals.ts`); the oximeter has none until the clinician gives a range (`config.vitalsWarningRanges.oxygenSaturationPct`, `null` for now).

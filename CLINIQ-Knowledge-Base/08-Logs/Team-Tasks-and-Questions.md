# Team Tasks and Questions

Things for the clinic, the school or the team to answer or do. They are not code defects, so they are kept here rather than in `Frontend-Issues-and-TODOs.md` (that file's legend: questions for people outside the team and team tasks are not logged there). Tick an item and add the answer, its date and who gave it when it is done.

## Professor's consultation, November 6, 2026 — Saturday, November 07, 2026 — 05:13 PHT

- [ ] **Ask the nurse which word she uses for what a student says they feel** (symptoms, complaint, other). Screens say "Symptoms" now (ADR-070); the word is in one place, `frontend/src/lib/labels.ts`, so her answer is a one-line change.
- [ ] **Confirm "Released to" with the nurse** (was "Collected by", ADR-070). Also ask whether "Other" plus "Specify who" covers everyone who takes a student home (neighbour, relative, guardian, driver).
- [ ] **Nurse to set "Commonly used for" on each item** (ADR-071). Three demo items carry starter tags only (paracetamol: Headache, Fever; mefenamic acid: Menstrual cramps, Toothache; loperamide: Stomachache), marked "to be confirmed by the clinician".
- [ ] **Ask whether the symptom list needs "LBM" (loose bowel movement)**. It has no such option, so loperamide is tagged "Stomachache" for now.
- [ ] **Decide whether items need a brand-name field** (for example "Biogesic" shown under paracetamol). Items carry only "Generic or branded" today, so the picker cannot show a brand name (ADR-071, Alternatives).

## Professor's consultation, Parts 2 to 4 — Saturday, November 07, 2026 — 06:37 PHT

- [ ] **Confirm the school year's dates with the Principal** (June 15 to April 14 from the October 17 meeting). They are now a setting on the Archive page; if the school changes its calendar, Staff change them there.
- [ ] **The Administrator should set up the authenticator app and keep the recovery codes** (ADR-073). Nobody else can reset the Administrator's password; without it a forgotten Admin password locks the school out of account management.
- [ ] **Tell the nurse and the Principal how recovery works**: an authenticator app on the phone (no internet needed), 8 one-time recovery codes kept somewhere safe, and the Administrator's reset as the fallback for Staff.
- [ ] **Ask the clinic which archive reasons they use** (now: Transferred, Graduated, Left the school, Other for students; Resigned, Retired, End of contract, Transferred, Other for staff).
- [ ] **Ask the nurse whether 7 days' notice before a school year's end or start is right** (ADR-075). It is a starting value, `SCHOOL_YEAR_NOTICE_DAYS` in `frontend/src/lib/schoolYear.ts`.

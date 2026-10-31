# Seed birthdates in calendar format

Date/Day/Time: Saturday, October 31, 2026 — 11:13 PHT
Agent: Claude Code (Opus 5.5)
Task: Store the seeded student birthdates as calendar dates instead of day offsets.
Status: Completed
Prompt/Request: Zean: "make the birthdate data in calendar format like YYYY-MM-DD or what's more appropriate".

## Files Modified

- `frontend/src/lib/mock-db/mock-db.json`, `seed.ts`, `types.ts`, `integrity.ts`, `api.ts`, `README.md`
- `frontend/src/lib/dates.ts`
- `frontend/src/features/student-records/Birthdate.test.tsx`
- `CLINIQ-Knowledge-Base/08-Logs/Changelog.md`

## Changes Made

- The 46 seeded birthdates changed from `{ "daysAgo": n }` to `"YYYY-MM-DD"`, resolved against October 31, 2026, so each student's age is unchanged today. The 6 `null` birthdates stay `null`.
- `SeedStudentRow` removed, since a seeded student now has the same shape as a stored one. `resolveSeed` no longer converts the birthdate.
- The seed integrity check now requires a real `YYYY-MM-DD` date or `null`, and still refuses a future date. `isRealDate` moved from `api.ts` to `lib/dates.ts` so both use it.
- The on-screen format is unchanged: the app already stored `YYYY-MM-DD` and shows it as "Mar 4, 2019".

## Reason

A birthdate is a fixed fact, so a day offset was the wrong shape for it and was hard to read in the seed. This reverses the build's default D8 (relative seed birthdates) at Zean's request.

## Testing Performed

Full suite with `--maxWorkers=3 --testTimeout=30000`: 12 failed, 827 passed. The earlier ADR-054 run at the same settings had 14 failed, 824 passed. Typecheck is clean after removing one unused import.

## Known Issues

A fixed birthdate means the demo students age with the real date while their grade stays the same. The unusual-age note allows 3 years, so the seed will need refreshing eventually.

## Next Steps

None.

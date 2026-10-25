Date/Day/Time: Sunday, October 25, 2026 — 22:07 PHT
Agent: Claude Code (Claude Opus 5.5)
Task: Trends demographic card: a visible "Filter by" label, stacked grade buttons, "cases" in every count
Status: Completed
Prompt/Request: Zean: "for the part 2 dashboard filter by sex and grade level, can you add text outside on the left like label Filter by to avoid confusion", then "Now that grades have more spaces now, do it like the Male and Female, name on top then counts on below, also add cases word in count, not just number since it might be confusing".
Files Modified: frontend/src/features/dashboard/components/ComplaintTrends.tsx, frontend/src/features/dashboard/components/ComplaintTrends.test.tsx
Changes Made:
- A visible "Filter by" label sits to the left of the Sex / Grade level switch, and the switch's accessible name is now "Filter by" (it was "Group visits and incidents by"). The card title keeps at least 14rem, so on a phone the label and switch drop below the title instead of squeezing it.
- The grade buttons use the same style as Female / Male: the name on top, the count below. The compact grade-only style (`GRADE_FILTER_BUTTON`) is removed.
- Counts read "1 case · 25%" / "3 cases · 75%" on both the sex and grade buttons. Zean asked for the grade buttons; the sex buttons got the same wording so they read alike.
- A space now separates the name and count in each button's accessible name. A screen reader used to hear "Grade 11 case" (and "Female3"); this was found by the test.
Reason: Zean's request; the switch could be read as unlabeled, and a bare number beside a percentage was unclear.
Testing Performed: Dashboard tests 53/53 pass; typecheck and lint for the dashboard folder are clean. Screenshots of the card at 1440 and 390 px (sex and grade), opened and checked: no horizontal scroll; the label is visible and aligned. They are kept in the session scratchpad, outside the repo.
Known Issues: The control switches what the chart groups by; it doesn't filter the data. The filter buttons below it do the filtering. The label wording is Zean's choice.
Next Steps: None.

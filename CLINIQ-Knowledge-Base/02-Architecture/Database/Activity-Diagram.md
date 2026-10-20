# Activity Diagrams

**Status: first draft, built from already-documented requirements.** These three flows were identified (in this same file, before this draft existed) as the highest-priority candidates — the ones with the most non-obvious branching logic already written out in prose across the Frontend Context Brief, Frontend Design Reference, and Modules & Features. Built directly from that prose, not invented.

## 1. (Removed)

This flow described the QR scan and its quick actions, which were removed from the app (ADR-027). The section number is kept so the other flows keep theirs.

## 2. Two-Stage Emergency Response Flow

The clearest case of a genuine state machine in the whole system — modeled as one, not a linear flowchart.

```mermaid
stateDiagram-v2
    [*] --> Stage1_InProgress: Staff opens Incident Entry

    Stage1_InProgress --> Stage1_Saved: Save (complaint only,<br/>readings as needed —<br/>nothing else required)

    Stage1_Saved --> NeedsCompletion: Status badge shows<br/>"Needs Completion"

    NeedsCompletion --> Stage2_InProgress: Staff reopens the record<br/>once the immediate<br/>situation is handled

    Stage2_InProgress --> Stage2_InProgress: Add readings as needed,<br/>treatment notes,<br/>hospital referral,<br/>parent notification attempts

    Stage2_InProgress --> Complete: All required fields<br/>present, save

    NeedsCompletion --> [*]: (record remains open<br/>indefinitely until completed —<br/>no forced deadline)
    Complete --> [*]

    note right of Stage1_Saved
        Every save at every stage
        writes to the Audit Trail
        (login/submit/approve —
        Stage 1 save counts as a
        submit event, logged
        independently of Stage 2)
    end note
```

**Why this matters as its own diagram:** the entire design rationale for the two-stage flow is "speed over completeness in the first moment" — a flowchart that treated this as one linear "fill out the incident form" process would misrepresent the actual requirement. The state diagram makes explicit that `NeedsCompletion` is a real, potentially long-lived state, not a transient step.

## 3. Follow-Up Handling Flow

Shared between Clinic Visit Monitoring and Emergency Response — same feature, two entry points, converging on one flow.

```mermaid
flowchart TD
    VISITEND([Staff finishes<br/>Record Visit]) --> PROMPT
    INCIDENTEND([Staff finishes<br/>Log Emergency]) --> PROMPT

    PROMPT{"Does this student<br/>need a follow-up?"}
    PROMPT -->|No| SAVENORMAL[Save visit/incident<br/>as normal] --> DONE1([End])

    PROMPT -->|Yes| CAPTURE[Capture inline:<br/>follow-up date,<br/>reason/instruction,<br/>optional notes]
    CAPTURE --> SAVEBOTH[Save visit/incident<br/>AND Follow-Up together —<br/>one flow, not two separate steps]
    SAVEBOTH --> PENDING[Follow-Up status: Pending]

    PENDING --> DASHBOARD[/Surfaces on Clinic Overview<br/>Dashboard's due/upcoming list —<br/>computed fresh on page load,<br/>NOT a push notification/]

    DASHBOARD --> STAFFCHECK{Staff reviews<br/>due follow-ups}
    STAFFCHECK -->|Student returned,<br/>monitored| COMPLETED[Mark: Completed]
    STAFFCHECK -->|Student never<br/>returned| MISSED[Mark: Missed]
    STAFFCHECK -->|No longer<br/>needed| CANCELLED[Mark: Cancelled]

    COMPLETED --> DONE2([End])
    MISSED --> DONE2
    CANCELLED --> DONE2
```

**The one design constraint this diagram exists to make visible:** the "surfaces on Dashboard" step is explicitly a *pull* mechanism (Staff has to look), not a *push* one — there's no background job or notification service anywhere in this architecture (Project Plan §1.4, SMS/push explicitly out of scope). Any implementation that tries to add a scheduled reminder job would be solving a problem this flow was deliberately designed not to need.

## Notes

- These three aren't the *only* flows in the system — they're the three worth diagramming first because they're the ones with real branching/state logic. Most other flows (a standard CRUD form, a report generation) are straightforward enough that a diagram would just restate the obvious.
- If a new flow gets added later with comparable complexity (the barcode-scanner proposal, if it's ever approved, likely qualifies), add it here rather than leaving it undiagrammed.

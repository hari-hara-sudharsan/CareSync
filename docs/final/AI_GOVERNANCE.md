# CareSync — AI Governance & Human-in-the-Loop Architecture

**Documentation Version**: 1.0.0 (Phase 13F Final)  
**Governance Principle**: **"AI Recommends. Human Approves."**

---

## 1. Product Thesis

> **"CareSync coordinates care autonomously, but never autonomously grants authority over consequential care decisions."**

In healthcare and eldercare applications, fully autonomous AI task assignment introduces severe risk. If an algorithm assigns an unqualified or unvetted caregiver to an elderly parent without oversight, there is zero human recourse.

CareSync solves this by placing an **Explainable AI Matching Engine** upstream of a **Human Coordinator Approval Gate**.

```text
                        HUMAN-IN-THE-LOOP AI PIPELINE
                                      │
 ┌────────────────┐         ┌──────────────────┐         ┌──────────────────┐
 │ Parent Request │  ────►  │ Strands AI Agent │  ────►  │ Explainable Match│
 │ (e.g. Grocery) │         │ Outbox Processing│         │ Scoring (94%)    │
 └────────────────┘         └──────────────────┘         └──────────────────┘
                                                                   │
                                                                   ▼
 ┌────────────────┐         ┌──────────────────┐         ┌──────────────────┐
 │ Volunteer Task │  ◄────  │ Human Coordinator│  ◄────  │ Decision Card    │
 │ Dispatched     │         │ Approval Gate    │         │ Surfaced in UI   │
 └────────────────┘         └──────────────────┘         └──────────────────┘
```

---

## 2. Explainable AI Match Rationale Component

Every decision card surfaced to the Human Coordinator presents four explicit explainability dimensions:

1. **Match Confidence Score**: Quantitative match percentage (e.g. `94% Match Confidence`).
2. **Geographic Proximity**: Distance radius verification (< 5 miles).
3. **Availability & Schedule**: Calendar slot alignment check.
4. **Care Capability & Ratings**: Skills verification and historical care performance rating.

---

## 3. Human Control & Override Options

The Human Coordinator retains absolute control:
- **Approve Assignment**: Authorizes the AI's top recommendation and dispatches the task to the volunteer.
- **Select Alternative Candidate**: Overrides top match and selects a different volunteer candidate from the pool.
- **Decline & Request More Info**: Declines assignment and routes request back to family oversight.

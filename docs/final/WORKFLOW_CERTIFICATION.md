# CareSync — Workflow Certification Report (Phase 13H)

> **Status:** `WORKFLOW LIFECYCLE CERTIFIED` 🟢  
> **Date:** August 26, 2026  
> **Scope:** Care Request Lifecycle State Machine

---

## 1. State Machine & Transition Rules

```text
                  [ Care Request Created ]
                             │
                             ▼
                   PENDING_ASSIGNMENT
                             │
            ┌────────────────┴────────────────┐
            │  AI Candidate Matching Engine   │
            └────────────────┬────────────────┘
                             │
                             ▼
               [ MATCHING_RECOMMENDATION ]
                   (Decision Card Seeded)
                             │
                             ▼
             [ Human Coordinator Review ]
                             │
             ┌───────────────┴───────────────┐
             │                               │
             ▼                               ▼
         [ REJECT ]                     [ APPROVE ]
             │                               │
             ▼                               ▼
       PENDING_ASSIGNMENT                 ASSIGNED
                                             │
                                             ▼
                                          ACCEPTED
                                             │
                                             ▼
                                        IN_PROGRESS
                                             │
                                             ▼
                                         COMPLETED
                                             │
                                             ▼
                                           CLOSED
```

---

## 2. Transition Verification Matrix

| From State | Trigger Action | Executed By | Valid To State | Invalid Transitions (Rejected) |
|---|---|---|---|---|
| Initial | `POST /care-requests` | Parent / Guardian | `PENDING_ASSIGNMENT` | Direct assignment by client (400) |
| `PENDING_ASSIGNMENT` | AI Engine Run | Outbox / System | `PENDING_ASSIGNMENT` (Decision Seeded) | Auto-assigning volunteer without human approval (403) |
| `PENDING_ASSIGNMENT` | `POST /decisions/{id}/resolve` | Coordinator / Admin | `ASSIGNED` | Direct completion by volunteer (403) |
| `ASSIGNED` | Volunteer Accepts Task | Assigned Volunteer | `ACCEPTED` | Acceptance by unassigned volunteer (403) |
| `ACCEPTED` | Volunteer Starts Task | Assigned Volunteer | `IN_PROGRESS` | Parent confirmation before completion (400) |
| `IN_PROGRESS` | Volunteer Completes Task | Assigned Volunteer | `COMPLETED` | Direct transition to CLOSED without parent (400) |
| `COMPLETED` | Parent Confirms Task | Parent / Guardian | `CLOSED` | Re-opening closed task without new request (400) |

---

## 3. Audit Trail Verification
Every status transition records an immutable audit record in PostgreSQL (`audit_events` table):
- `event_type`: `CARE_REQUEST_CREATED`, `DECISION_RESOLVED`, `TASK_ASSIGNED`, `TASK_COMPLETED`, `TASK_CLOSED`.
- `actor_id`: User ID of executing principal.
- `payload`: State parameters, notes, and timestamps.

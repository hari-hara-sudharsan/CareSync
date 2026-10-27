# CareSync — Product Truth & Architectural Baseline

## 1. Product Thesis

> **CareSync does not replace family caregiving. CareSync builds the coordination network that makes reliable caregiving possible even when family cannot be physically present.**

CareSync is a multi-sided care orchestration platform designed around high-stakes elder care. The platform bridges the physical and temporal gaps between aging parents, dispersed family caregivers, verified community volunteers, and professional care coordinators.

---

## 2. Core CareRequest Lifecycle & Normalization

Every care need entering the system normalizes into a first-class domain entity: **CareRequest**.

```text
Parent / Caregiver Need
        ↓
   CareRequest (Created)
        ↓
  Classification (Category, Urgency, Skill / Privacy Requirements)
        ↓
Family-First Coordination (Check Circle Availability)
        ↓
Volunteer Fallback (When Family Unavailable / Out-of-Area)
        ↓
AI / Deterministic Matching Recommendation (Proximity, Verification, Reliability)
        ↓
HUMAN APPROVAL (Coordinator / Family Consequential Decision)
        ↓
Assignment & Task Dispatch
        ↓
Task Execution (Accept → Start → Complete + Notes)
        ↓
Parent / Family Confirmation
        ↓
Closure & Immutable Care History Log
```

### Supported Care Activity Categories:
1. **Daily Safety Check-In**: Well, Need Help, Need Urgent Help.
2. **Medication Adherence**: Schedule tracking, dosage logging, refill errand triggering.
3. **Medical Appointments**: Specialist visits, pre-visit instructions, transportation requirements.
4. **Transportation & Mobility**: Pickup, dropoff, companion requirements, wheelchair access.
5. **Grocery & Pharmacy Errands**: Prescriptions, supplies, item delivery.
6. **Safety & Wellbeing Concerns**: Escalations, caregiver alerts, fall/unresponsive reporting.

---

## 3. The Five Distinct Role Experiences

CareSync explicitly rejects a single generic SaaS dashboard with a frontend persona switcher. The system comprises five distinct role-specific workspaces:

```
+-----------------------------------------------------------------------------+
|                          CARESYNC APPLICATION SHELL                          |
|                                                                             |
|  [Authentication] -> [Authoritative User] -> [Authoritative Role]            |
|         │                                                                   |
|         ├── PARENT -------------> 👴 Parent Protected Care App              |
|         ├── FAMILY -------------> 👨👩👧 Family Operational Workspace        |
|         ├── VOLUNTEER ----------> 🤝 Volunteer Task-Scoped Workspace        |
|         ├── COORDINATOR --------> 🧑💼 Coordinator Decision Inbox Console    |
|         └── ADMIN / TRUST ------> 🛡️ Trust, Safety & Governance Console      |
+-----------------------------------------------------------------------------+
```

### Role 1: 👴 Parent (Care Receiver)
* **Product Purpose**: Simple, reassuring, high-contrast, distraction-free care experience.
* **Core Mindset**: *"Am I okay? What is happening today? Who is helping me? What happens next?"*
* **Core Capabilities**:
  * One-tap Daily Check-In ("I'm Good", "Need Some Help", "Need Help Now").
  * Today's Medication & Appointment schedule preview.
  * Simple "Ask for Help" trigger (Pharmacy, Groceries, Rides, Chores).
  * Direct Care Circle contact list.
  * One-click task completion confirmation.
  * Safety concern / emergency escalation prompt.
* **Forbidden**: Operational metrics, raw matching engine scores, candidate comparisons, admin controls, system configurations.

### Role 2: 👨👩👧 Family Caregiver (Care Coordinator)
* **Product Purpose**: Operational family command center for one or more connected parents.
* **Core Mindset**: *"What is happening with my parent right now, and what consequential decisions need my input?"*
* **Core Capabilities**:
  * Multi-parent switcher (strictly restricted to care networks where user has verified membership).
  * Real-time Care Overview (Check-in status, medication adherence, upcoming trips).
  * Decision Inbox (Human-in-the-loop approvals for transport, scheduling, and family tasks).
  * CareRequest creation, delegation, and status tracking.
  * Care Team management (inviting guardians, assigning permissions).
  * Chronological Care Log & family communication thread.
* **Forbidden**: Volunteer execution workspace, cross-family parent records, administrative system mutation.

### Role 3: 🤝 Volunteer Helper (Task Executor)
* **Product Purpose**: Focused task execution workspace with strict least-privilege privacy.
* **Core Mindset**: *"What care task am I responsible for right now, where do I go, and what do I do?"*
* **Core Capabilities**:
  * Verification & background check onboarding status.
  * Availability toggle & radius settings.
  * Candidate task pool (sanitized, task-scoped data without full medical history).
  * Assigned task lifecycle: **Accept Task → Start Task → Complete Task + Completion Notes**.
  * Task history & community reliability rating.
* **Forbidden**: Access to parent medical history, unrelated appointments, family chat, other volunteers' tasks, admin console.

### Role 4: 🧑💼 Care Coordinator (Matching & Decision Authority)
* **Product Purpose**: Operational dispatch and human decision console.
* **Core Mindset**: *"Which pending care requests require optimization, and which AI recommendations should I validate?"*
* **Core Capabilities**:
  * Triage & Decision Inbox for unassigned or escalated care requests.
  * Deterministic & AI Candidate Recommendation review (matching score breakdown: proximity, reliability, verification, availability).
  * Consequential Human Assignment Approval (AI recommends, human commits).
  * Manual assignment override & re-matching trigger.
  * Escalation handling for overdue or failed tasks.
* **Forbidden**: Unaudited silent automated assignments for critical/safety-sensitive tasks.

### Role 5: 🛡️ Admin / Trust & Safety (Governance & Oversight)
* **Product Purpose**: System-wide governance, auditability, volunteer vetting, and safety escalation console.
* **Core Mindset**: *"Is the coordination network operating safely, lawfully, reliably, and without integrity violations?"*
* **Core Capabilities**:
  * Identity & Volunteer Verification review (ID check, background check approval).
  * Safety Incident & Complaint management (filing, investigation, resolution, sanctions).
  * Tamper-evident Audit Log inspection (Who, What, When, Resource, Action, Outcome).
  * Task Reliability scoring & reputation monitoring.
  * System health & outbox queue telemetry.
* **Forbidden**: Direct modification of closed care history records (append-only audit guarantee).

---

## 4. AI Governance Boundary

```text
       ┌────────────────────────────────────────────────────────┐
       │                 CARE COORDINATOR AGENT                 │
       │                                                        │
       │  • Analyzes CareRequest requirements                   │
       │  • Evaluates candidate pool (Family + Volunteers)       │
       │  • Computes match scores & explainable rationale       │
       │  • Formulates Decision Card recommendation             │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │                CONSEQUENTIAL BOUNDARY                  │
       │                                                        │
       │       ❌ AI CANNOT ASSIGN OR COMMIT TASKS ALONE        │
       │       ✓ AI SURFACES RECOMMENDATION TO HUMAN            │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │             HUMAN DECISION (HITL / ABAC)               │
       │                                                        │
       │  • Coordinator / Primary Guardian reviews rationale    │
       │  • Human explicitly clicks [Approve Assignment]        │
       │  • System records authenticated AuditEvent             │
       │  • Task state transitions to ASSIGNED                  │
       └───────────────────────────┬────────────────────────────┘
```

---

## 5. Authentication Architecture

```text
[Phone Number]
      ↓
[POST /api/v1/auth/request-otp] ──> Rate Limit Check (Cooldown & SMS Delivery)
      ↓
[6-Digit OTP Challenge Generated] ──> Redis / DB Active Challenge Store
      ↓
[POST /api/v1/auth/verify-otp] ──> Validates Challenge Code
      ↓
[Authoritative User Record Resolved] ──> Check active status
      ↓
[JWT Access Token Issued] ──> Subject = user_id, Claims = [user_id, role]
      ↓
[Client Stores Bearer Token] ──> Header: "Authorization: Bearer <token>"
```

* **No Hardcoded Tokens**: Mock tokens and persona bypassing are strictly disallowed.
* **Session Verification**: The frontend queries `/api/v1/auth/me` on boot to resolve authoritative identity and role.

---

## 6. Authorization Architecture (ABAC Security Model)

Authorization is governed by Attribute-Based Access Control (**ABAC**), evaluating:

$$\text{Decision} = f(\text{User Role}, \text{Care Network Relationship}, \text{Target Resource}, \text{Task Scope}, \text{Requested Action})$$

```text
┌────────────────────────────────────────────────────────────────────────┐
│                      AUTHORIZATION EVALUATION CHAIN                    │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Token Signature & Expiry Check (JWT)                                │
│ 2. User Active Check (Database)                                        │
│ 3. Global Role Check (ADMIN bypasses network, others proceed)          │
│ 4. Care Network Membership Check:                                      │
│    - Is user the Parent themselves?                                    │
│    - Is user an ACTIVE CareMember for this parent_id?                  │
│    - Is user an ASSIGNED volunteer for this specific care_request_id?  │
│ 5. Task Scoping & Least Privilege Filter:                              │
│    - Volunteers receive ONLY task time, pickup/dropoff, category.      │
│    - Volunteers DO NOT receive unrelated medical history or notes.     │
│ 6. Action Permission Evaluation:                                       │
│    - Parent: READ own, CREATE own, CONFIRM own.                        │
│    - Family: READ circle, CREATE circle, APPROVE circle.               │
│    - Volunteer: READ assigned, ACCEPT assigned, START, COMPLETE.       │
│    - Coordinator: READ all pending, TRIGGER match, ASSIGN.             │
│    - Admin: READ trust/audit, VERIFY users, RESOLVE complaints.        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Data Ownership & Security Boundaries

1. **Parent Health & Care Records**: Owned by the Parent Profile; read-access delegated strictly to active `CareMember` records with appropriate permissions (`MEDICATION`, `APPOINTMENTS`, `CHECK_INS`).
2. **Task-Scoped Privacy**: Volunteers are granted ephemeral, task-scoped access to care request logistics only while assigned to that task.
3. **Append-Only Audit Log**: `AuditEvent` and `OutboxEvent` records are immutable and must never be updated or deleted.
4. **Human Accountability**: Every consequential transition (assignment, cancellation, escalation, verification, sanction) records `actor_id`, `actor_role`, `timestamp`, and `action_rationale`.

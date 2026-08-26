# CareSync — Product System Walkthrough & User Journey

**Documentation Version**: 1.0.0 (Phase 13F Final)  
**System Status**: Fully Operational & Verified 🟢

---

## 1. System Overview

CareSync is an end-to-end real-time care coordination platform. It connects vulnerable family members (Parents), family oversight networks (Family), community caregivers (Volunteers), and care managers (Coordinators/Admins) within a unified, identity-guarded system.

```text
                        CARESYNC WORKSPACE ECOSYSTEM
                                     │
       ┌──────────────┬──────────────┼──────────────┬──────────────┐
       ▼              ▼              ▼              ▼              ▼
  PARENT WORKSPACE  FAMILY WORKSPACE  VOLUNTEER WS  COORDINATOR WS   ADMIN WS
  • Daily Check-in  • Care Calendar  • Opp Pool     • AI Decisions  • Trust & Risk
  • Request Care    • Active Care    • Task States  • Match Audit   • Audit Trail
  • Confirm Task    • Notifications  • History      • Rationale     • System Health
```

---

## 2. Role-Based User Journeys

### Journey A: The Parent Experience (Sarah Jenkins)
1. **Authentication**: Enters phone `+15550000001`, receives dev OTP via `/auth/dev-otp-sink`, verifies challenge, receives signed JWT token.
2. **Parent Home Dashboard**: Displays warm `#FAF7F1` care status banner, daily check-in options (`GOOD`, `NEED_HELP`, `NEED_HELP_NOW`), active care request cards, and medication reminders.
3. **Care Request Submission**: Submits structured requests across Grocery, Transportation, Medication, or Safety categories.
4. **Completion Confirmation**: Reviews completed volunteer deliveries and confirms resolution (`POST /care-requests/{id}/confirm-completion`).

### Journey B: The Family Member Experience (David Jenkins)
1. **Family Dashboard**: Monitors parent's daily check-in status and active care requests.
2. **Care Log & Notifications**: Receives real-time notifications when requests transition states. Views audit log of past activities.
3. **Care Team Management**: Invites and coordinates trusted family care members.

### Journey C: The Volunteer Experience (Elena Rostova)
1. **Volunteer Opportunity Board**: Views available care tasks in proximity radius.
2. **Task Lifecycle**:
   - `Accept Opportunity` → Transitions task from candidate pool to assigned (`ASSIGNED`).
   - `Start Delivery` → Updates status to `IN_PROGRESS`.
   - `Complete Task` → Submits completion note, updates status to `COMPLETED`.

### Journey D: The Coordinator Governance Experience (Marcus Vance)
1. **Decision Inbox**: Inspects AI-surfaced decision cards (`/decisions`).
2. **Explainable AI Rationale**: Reviews candidate match confidence % and evidence factors (distance, skills, availability).
3. **Human Action**: One-click approval (`POST /decisions/{id}/approve`) dispatches assignment via outbox dispatcher.

### Journey E: The System Administrator Experience (Admin)
1. **Trust & Safety Dashboard**: Monitors system-wide risk scores, active user accounts, and real-time outbox event dispatch metrics (`/trust/dashboard`).
2. **Audit Verification**: Inspects immutable PostgreSQL audit log records.

---

## 3. Data Integrity & State Guarantees

- **No Mock Fallbacks**: All workspace read models are fetched dynamically from PostgreSQL via FastAPI endpoints (`/auth/me`, `/parent/home`, `/volunteer/home`, `/trust/dashboard`, `/settings`, `/notifications`).
- **Identity Isolation**: User role is derived strictly from JWT subject claim (`sub -> User.id -> User.role`). Changing frontend routes without authorized role credentials results in HTTP 403 server-side rejection.
- **Transactional Consistency**: All care request state mutations emit Outbox Events within the primary database transaction.

# CareSync — Role Workspace & Authorization Matrix

This matrix establishes the authoritative specification for all five distinct role workspaces in CareSync.

---

## 1. Role Workspace Matrix Overview

| Feature / Domain | 👴 Parent | 👨👩👧 Family | 🤝 Volunteer | 🧑💼 Coordinator | 🛡️ Admin |
|---|:---:|:---:|:---:|:---:|:---:|
| **Primary Route** | `/parent/home` | `/family/home` | `/volunteer/home` | `/coordinator/dashboard` | `/admin/dashboard` |
| **Authentication Flow** | Phone + OTP | Phone + OTP | Phone + OTP | Phone + OTP | Phone + OTP / Admin Cred |
| **Onboarding** | `/parent/onboarding` | `/family/onboarding` | `/volunteer/onboarding` | Direct Provisioning | Direct Provisioning |
| **Daily Check-In** | Create / View Own | View Connected | - | View Monitored | View All Alerts |
| **Medication Tracking** | Log Own Taken/Skipped | View Circle Adherence | - | View Circle Schedule | Audit Logs Only |
| **Appointments & Rides** | Request Ride / View | Coordinate / Confirm | - | Triage Transport | Audit Logs Only |
| **CareRequest Creation** | Create Own | Create for Parent | - | Create System Req | Create System Req |
| **CareRequest Execution** | Confirm Completion | Review / Track | Accept/Start/Done | - | - |
| **Matching & Triage** | - | Approve Family Candidate | View Eligible Pool | Review / Re-Match / HITL Commit | Full System Override |
| **Care Circle Management** | View Members | Invite / Manage Perms | - | View Contact Hierarchy | User Governance |
| **Trust & Verification** | - | - | View Verification State | View Reliability Scores | Approve ID/BG Check |
| **Complaints & Safety** | Report Concern | File Complaint | Report Task Blocker | Review Escalations | Investigate / Sanction |
| **Audit Logs** | - | - | - | View Task History | Full Tamper-Evident Audit |

---

## 2. Detailed Role Specifications

### 👴 Role 1: Parent (`PARENT`)

* **Authorized Routes**:
  * `/parent/welcome` (Public)
  * `/parent/login` (Public)
  * `/parent/onboarding` (Protected)
  * `/parent/home` (Protected)
  * `/parent/check-in` (Protected)
  * `/parent/medication` (Protected)
  * `/parent/appointment` (Protected)
  * `/parent/care-team` (Protected)
  * `/parent/care-log` (Protected)
  * `/settings` (Protected)
* **Key Frontend Components**:
  * `CheckInCard`, `MedicationCard`, `AppointmentCard`, `CareRequestCard`, `CareMemberCard`, `CareStatus`, `CareBottomNavigation`.
* **Backend API Endpoints**:
  * `GET /api/v1/parent/home`
  * `POST /api/v1/check-ins`
  * `GET /api/v1/medications/today`
  * `POST /api/v1/medications/{id}/events`
  * `GET /api/v1/appointments`
  * `POST /api/v1/appointments/{id}/transportation`
  * `POST /api/v1/care-requests`
  * `POST /api/v1/care-requests/{id}/confirm`
  * `GET /api/v1/parent/care-team`
* **Database Entities**:
  * `users`, `parent_profiles`, `checkin_events`, `medications`, `medication_events`, `appointments`, `care_requests`, `care_members`.
* **Allowed Actions**:
  * Submit daily check-in (WELL / NEED_HELP / NEED_HELP_NOW).
  * Toggle today's scheduled medication dose as taken.
  * Request transport assistance for scheduled doctor appointments.
  * Create ad-hoc care requests (errands, companionship, pharmacy).
  * Confirm task completion when caregiver marks a task finished.
  * Direct one-tap calling to listed Care Circle members.
* **Forbidden Actions**:
  * Accessing another parent's records (strictly ABAC isolated).
  * Assigning volunteers or viewing candidate matching scores.
  * Accessing Family, Volunteer, Coordinator, or Admin workspaces.
  * Direct database mutation of medical prescriptions.

---

### 👨👩👧 Role 2: Family / Caregiver (`FAMILY`, `PRIMARY_GUARDIAN`)

* **Authorized Routes**:
  * `/family/home` (Protected)
  * `/family/requests` (Protected)
  * `/family/appointments` (Protected)
  * `/family/medications` (Protected)
  * `/family/check-ins` (Protected)
  * `/family/care-team` (Protected)
  * `/family/care-log` (Protected)
  * `/family/concerns` (Protected)
  * `/settings` (Protected)
* **Key Frontend Components**:
  * `FamilyTopBar` (Parent Context Switcher), `FamilySidebar`, `DecisionInboxCard`, `CareRequestTable`, `CareCircleManager`, `CareLogTimeline`.
* **Backend API Endpoints**:
  * `GET /api/v1/family/home?parent_id={id}`
  * `GET /api/v1/care-requests?parent_id={id}`
  * `POST /api/v1/care-requests`
  * `GET /api/v1/decisions?parent_id={id}`
  * `POST /api/v1/decisions/{id}/respond`
  * `GET /api/v1/parent/care-team?parent_id={id}`
  * `POST /api/v1/parent/care-team/invite`
  * `POST /api/v1/trust/complaints`
* **Database Entities**:
  * `care_members`, `parent_profiles`, `care_requests`, `decision_cards`, `checkin_events`, `medications`, `appointments`, `complaints`.
* **Allowed Actions**:
  * Switch between supported parents where active `CareMember` record exists.
  * Review and respond to Decision Cards (Approve ride, accept task, re-assign).
  * Create, edit, and cancel care requests for connected parent.
  * Invite new family/guardians and configure task permissions.
  * Monitor real-time daily check-in, medication adherence, and timeline events.
  * File safety concerns or service complaints regarding volunteers.
* **Forbidden Actions**:
  * Accessing parents where no active `CareMember` record links user.
  * Accessing Volunteer task execution workspace or accepting volunteer tasks.
  * Accessing Admin trust verification or audit consoles.
  * Arbitrary persona switching to Parent UI.

---

### 🤝 Role 3: Volunteer Helper (`VOLUNTEER`)

* **Authorized Routes**:
  * `/volunteer/home` (Protected)
  * `/volunteer/tasks` (Protected)
  * `/volunteer/history` (Protected)
  * `/volunteer/profile` (Protected)
  * `/settings` (Protected)
* **Key Frontend Components**:
  * `VolunteerHeaderBar`, `AssignedTaskCard`, `AvailableOpportunityCard`, `TaskExecutionModal`, `TaskScopePrivacyBanner`.
* **Backend API Endpoints**:
  * `GET /api/v1/volunteer/home`
  * `GET /api/v1/volunteer/tasks`
  * `POST /api/v1/care-requests/{id}/accept`
  * `POST /api/v1/care-requests/{id}/start`
  * `POST /api/v1/care-requests/{id}/complete`
  * `POST /api/v1/care-requests/{id}/decline`
  * `GET /api/v1/trust/reliability/{user_id}`
* **Database Entities**:
  * `users`, `verification_records`, `task_reliability`, `care_requests`, `assignment_history`, `audit_events`.
* **Allowed Actions**:
  * View verification status (ID checked, Background check cleared).
  * Toggle availability on/off and configure assistance radius.
  * View sanitized, task-scoped opportunities (time, category, rough location).
  * Execute assigned tasks: Accept -> Start -> Complete with delivery/trip notes.
  * View own completion history and community reliability score.
* **Forbidden Actions**:
  * Accessing parent medical history, diagnosis, medication list, or private notes.
  * Viewing tasks assigned to other volunteers.
  * Self-assigning tasks without Coordinator or Family dispatch approval.
  * Accessing Parent, Family, Coordinator, or Admin workspaces.

---

### 🧑💼 Role 4: Care Coordinator (`COORDINATOR`)

* **Authorized Routes**:
  * `/coordinator/dashboard` (Protected)
  * `/coordinator/triage` (Protected)
  * `/coordinator/matching/{request_id}` (Protected)
  * `/coordinator/escalations` (Protected)
  * `/settings` (Protected)
* **Key Frontend Components**:
  * `CoordinatorTopBar`, `TriageQueueTable`, `CandidateComparisonView`, `MatchingScoreBreakdown`, `HumanApprovalModal`, `EscalationAlertBanner`.
* **Backend API Endpoints**:
  * `GET /api/v1/care-requests?status_filter=PENDING_ASSIGNMENT`
  * `GET /api/v1/care-requests/{id}/candidates`
  * `POST /api/v1/care-requests/{id}/assign`
  * `POST /api/v1/care-requests/{id}/rematch`
  * `GET /api/v1/decisions`
  * `GET /api/v1/trust/reliability/{user_id}`
* **Database Entities**:
  * `care_requests`, `assignment_history`, `decision_cards`, `task_reliability`, `verification_records`, `parent_profiles`, `users`.
* **Allowed Actions**:
  * Review unassigned, pending, or escalated CareRequests across the network.
  * Inspect AI/deterministic matching recommendations and explainable score factors (distance, reliability, skill).
  * Consequentially assign volunteers or family members to care requests.
  * Re-trigger matching engine when constraints change or timeout occurs.
  * Resolve routing escalations for missed check-ins or transport blockers.
* **Forbidden Actions**:
  * Modifying parent medical prescriptions without authorized clinical intake.
  * Bypassing human approval on consequential safety assignments.
  * Accessing volunteer task execution actions (Accept/Start/Complete).

---

### 🛡️ Role 5: Admin / Trust & Safety (`ADMIN`)

* **Authorized Routes**:
  * `/admin/dashboard` (Protected)
  * `/admin/verifications` (Protected)
  * `/admin/complaints` (Protected)
  * `/admin/audit-log` (Protected)
  * `/admin/users` (Protected)
  * `/settings` (Protected)
* **Key Frontend Components**:
  * `AdminTopBar`, `TrustMetricsGrid`, `VerificationReviewDrawer`, `ComplaintInvestigationModal`, `AuditLogExplorer`, `SanctionControlPanel`.
* **Backend API Endpoints**:
  * `GET /api/v1/trust/dashboard`
  * `GET /api/v1/trust/verifications`
  * `POST /api/v1/trust/verifications/{id}/review`
  * `GET /api/v1/trust/complaints`
  * `POST /api/v1/trust/complaints/{id}/resolve`
  * `GET /api/v1/admin/audit-events`
  * `GET /api/v1/admin/users`
  * `POST /api/v1/admin/users/{id}/suspend`
* **Database Entities**:
  * `users`, `verification_records`, `complaints`, `trust_events`, `audit_events`, `task_reliability`, `outbox_events`.
* **Allowed Actions**:
  * Review and approve/reject volunteer ID and background check submissions.
  * Investigate safety complaints, file incident findings, and issue sanctions/bans.
  * Inspect full append-only system audit log with cryptographic/temporal integrity.
  * Manage user active/suspended state and account governance.
  * Monitor system health, rate limiter status, and outbox dispatcher queues.
* **Forbidden Actions**:
  * Mutating or deleting append-only audit events or processed domain events.
  * Impersonating parents or completing care tasks on behalf of volunteers without audit trail.

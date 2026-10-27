# CareSync — Product Gap Register

This register catalogues every identified gap across the CareSync repository, classified by severity from **P0** (Security/Authorization Failure) to **P4** (Cosmetic Polish).

---

## 1. Gap Severity Classification Scheme

* **P0 — Security / Authorization / Identity Failure**: Bypasses, hardcoded permissions, lack of server-side ABAC, persona impersonation, data leakage across parents.
* **P1 — Core Business Workflow Failure**: Broken end-to-end chains, mock returns in services, fake database writes, dead task state transitions.
* **P2 — Role Workspace Functionality Failure**: Missing role pages, disabled navigation items, lack of dedicated Coordinator vs Admin consoles.
* **P3 — UX / Navigation Failure**: Synthetic "QA State Simulator" dropdowns in production UI, dead buttons, missing loading/error boundaries.
* **P4 — Cosmetic Polish**: Alignment, typography, spacing, badge color consistency.

---

## 2. Itemized Gap Register

### 🚨 P0: Security, Identity & Authorization Failures (Count: 5)

| ID | Component | File Path | Defect Description | Required Remediation |
|---|---|---|---|---|
| **GAP-P0-01** | Backend ABAC | `backend/app/api/deps.py` | Hardcoded bypasses for `'p-1'`, `'p-2'`, and `'usr-demo-1'` granting arbitrary access. | Remove hardcoded strings; strictly query database `CareMember` and `ParentProfile` records. |
| **GAP-P0-02** | Frontend Shell | `frontend/src/app/router/AppRouter.tsx` | Permissive fallback routing allowing Family/Guardian roles into arbitrary subroutes. | Enforce strict role-specific workspace dispatching; reject unauthorized URLs. |
| **GAP-P0-03** | Volunteer Privacy | `backend/app/api/v1/care_requests.py` | Volunteer task view leaks full parent profile notes if category mapping fails. | Sanitize volunteer task payload to include only task time, location, and non-clinical instructions. |
| **GAP-P0-04** | Cross-Role Jumping | `frontend/src/features/family/navigation/FamilySidebar.tsx` | Direct "Parent View" button allows Family role to navigate into `/parent/home`. | Remove cross-role switcher; retain distinct workspace boundaries. |
| **GAP-P0-05** | Persona Switcher | `frontend/src/features/admin/CoordinatorAdminPage.tsx` | "Switch Persona" button in Admin console allows instant unauthenticated context hop. | Remove persona switcher; bind role strictly to authenticated session JWT. |

---

### ⚠️ P1: Core Business Workflow Failures (Count: 8)

| ID | Component | File Path | Defect Description | Required Remediation |
|---|---|---|---|---|
| **GAP-P1-01** | Parent Home Read Model | `backend/app/api/v1/parent.py` | `GET /api/v1/parent/home` returns static hardcoded JSON dictionary. | Query real DB tables: `ParentProfile`, `CheckInEvent`, `Medication`, `Appointment`, `CareRequest`. |
| **GAP-P1-02** | Parent Home Service | `frontend/src/services/parentHomeService.ts` | `acknowledgeMedication()` and `submitCheckIn()` return fake `{success: true}`. | Call live endpoints `POST /api/v1/medications/{id}/events` and `POST /api/v1/check-ins`. |
| **GAP-P1-03** | Parent Onboarding Invite | `backend/app/api/v1/parent.py` | `invite_care_member` returns `{success: true}` without creating a `CareMember` in DB. | Insert `CareMember` record with specified permissions into database. |
| **GAP-P1-04** | Care Team Service | `frontend/src/services/careTeamService.ts` | 100% Mock data in frontend service; no HTTP calls made. | Implement backend `GET /api/v1/parent/care-team` and `POST /api/v1/parent/care-team/invite`. |
| **GAP-P1-05** | Care Log Service | `frontend/src/services/careLogService.ts` | 100% Mock data in frontend service; no HTTP calls made. | Implement backend `GET /api/v1/parent/care-log` and `POST /api/v1/parent/care-log/message`. |
| **GAP-P1-06** | Volunteer Task Filtering | `frontend/src/features/volunteer/VolunteerHomePage.tsx` | Filters tasks by hardcoded volunteer IDs (`'usr-vol-1'`, `'c-3'`). | Filter tasks strictly using authenticated user's ID (`current_user.id`). |
| **GAP-P1-07** | Admin Metrics | `frontend/src/features/admin/CoordinatorAdminPage.tsx` | Hardcoded statistics (2 circles, 14 volunteers, 0 alerts). | Query live backend aggregation endpoint (`/api/v1/trust/dashboard`). |
| **GAP-P1-08** | Appointment Intent | `frontend/src/services/appointmentService.ts` | `createTransportationIntent()` returns fake ID without writing to backend. | Connect to backend appointment transportation workflow. |

---

### 🧩 P2: Role Workspace Functionality Failures (Count: 6)

| ID | Component | File Path | Defect Description | Required Remediation |
|---|---|---|---|---|
| **GAP-P2-01** | Coordinator Console | `frontend/src/features/` | Coordinator and Admin are merged into one generic screen (`CoordinatorAdminPage`). | Build dedicated Coordinator Decision & Triage Console (`/coordinator/dashboard`). |
| **GAP-P2-02** | Admin Console | `frontend/src/features/admin/` | Admin lacks volunteer verification review, complaint adjudication, and audit explorer. | Build dedicated Admin Trust & Safety Console (`/admin/dashboard`). |
| **GAP-P2-03** | Family Navigation | `frontend/src/features/family/navigation/FamilySidebar.tsx` | 7 routes marked `isSupported: false` ("Soon"). | Wire real pages for `/family/requests`, `/family/appointments`, `/family/medications`, `/family/care-team`. |
| **GAP-P2-04** | Admin Verification API | `backend/app/api/v1/trust.py` | Missing endpoint for Admin to approve/reject volunteer ID & background check. | Implement `POST /api/v1/trust/verifications/{id}/review`. |
| **GAP-P2-05** | Admin Audit Log API | `backend/app/api/v1/` | Missing backend endpoint to query immutable `AuditEvent` log. | Implement `GET /api/v1/admin/audit-events`. |
| **GAP-P2-06** | Admin User Governance API | `backend/app/api/v1/` | Missing backend endpoint to query users and suspend/activate accounts. | Implement `GET /api/v1/admin/users` and `POST /api/v1/admin/users/{id}/suspend`. |

---

### 🖥️ P3: UX & Navigation Failures (Count: 4)

| ID | Component | File Path | Defect Description | Required Remediation |
|---|---|---|---|---|
| **GAP-P3-01** | Parent QA Widget | `frontend/src/features/parent/home/ParentHomePage.tsx` | "QA State Simulator" dropdown embedded in production parent view. | Remove QA dropdown; render based exclusively on live server read-model. |
| **GAP-P3-02** | Family QA Widget | `frontend/src/features/family/home/FamilyHomePage.tsx` | "QA State Simulator" dropdown embedded in production family view. | Remove QA dropdown; render based exclusively on live server read-model. |
| **GAP-P3-03** | Parent Tab Sync | `frontend/src/features/parent/home/ParentHomePage.tsx` | Bottom navigation tabs switch local string state instead of triggering routing. | Connect bottom nav to real parent routes (`/parent/check-in`, `/parent/medication`, etc.). |
| **GAP-P3-04** | Family Log Redirect | `frontend/src/features/family/home/FamilyHomePage.tsx` | "Full Care Log" link redirects family member to `/parent/care-log`. | Redirect to family-scoped care log (`/family/care-log`). |

---

### 🎨 P4: Cosmetic Polish & Styling Improvements (Count: 3)

| ID | Component | File Path | Defect Description | Required Remediation |
|---|---|---|---|---|
| **GAP-P4-01** | TopBar Badges | `frontend/src/components/navigation/CareTopBar.tsx` | Role badge color inconsistently mapped between light and dark themes. | Standardize role token colors across all workspace headers. |
| **GAP-P4-02** | Skeleton Placeholders | `frontend/src/components/feedback/CareSkeleton.tsx` | Height mismatches between skeleton and loaded cards causing layout shift. | Align skeleton dimensions with actual card geometries. |
| **GAP-P4-03** | Mobile Padding | `frontend/src/features/parent/home/ParentHomePage.tsx` | Mobile horizontal padding slightly tight on narrow viewport widths (< 360px). | Adjust mobile container gutters for ultra-small screens. |

---

## 3. Summary Gap Counts

$$\begin{array}{|l|c|}
\hline
\textbf{Severity Level} & \textbf{Total Count} \\
\hline
\text{P0 — Security / Authorization / Identity Failure} & 5 \\
\text{P1 — Core Business Workflow Failure} & 8 \\
\text{P2 — Role Workspace Functionality Failure} & 6 \\
\text{P3 — UX / Navigation Failure} & 4 \\
\text{P4 — Cosmetic Polish} & 3 \\
\hline
\textbf{Total Identified Gaps} & \mathbf{26} \\
\hline
\end{array}$$

---

## 4. Recommended Execution Order for Recovery

To maintain architectural discipline and avoid premature closure, remediation must proceed in strict sequential order:

```text
Phase 14R.1: Security & Identity Lock (P0)
   - Eliminate deps.py hardcoded bypasses
   - Enforce server-side ABAC and remove persona switchers
       ↓
Phase 14R.2: Parent Experience (P1 + P2)
   - Real Parent Home read-model endpoint & DB queries
   - Live check-in, medication, appointment, care-team, care-log APIs
   - Remove Parent QA dropdown widget
       ↓
Phase 14R.3: Family Caregiver Workspace (P1 + P2)
   - Multi-parent selector bound to authenticated care network
   - Real Decision Inbox, Care Requests, and Care Log
   - Remove Family QA dropdown widget
       ↓
Phase 14R.4: Volunteer Task Workspace (P1 + P2)
   - Live task-scoped data without clinical leakage
   - Real Accept -> Start -> Complete lifecycle with notes
   - Dynamic reliability score
       ↓
Phase 14R.5: Coordinator Decision Console (P1 + P2)
   - Dedicated Coordinator console separated from Admin
   - Decision triage queue, AI matching rationale review, human approval
       ↓
Phase 14R.6: Admin Trust & Safety Console (P1 + P2)
   - Volunteer verification approval/rejection
   - Complaint investigation & sanctions
   - Tamper-evident audit log explorer
       ↓
Phase 14R.7: Full Cross-Role E2E Verification (P3 + P4)
   - Automated end-to-end integration suite across all 5 personas
   - Cross-parent and cross-network security boundary validation
```

---

## 5. Status Update — Phase 14R.1 Closure (2026-10-27)

Evidence: `docs/recovery/PHASE_0_BASELINE_REPORT.md`, `backend/tests/test_phase_14r1_security_lock.py`,
`backend/tests/test_phase_14r1_role_policy.py`.

### P0 (original)

| ID | Status | Evidence |
|---|---|---|
| GAP-P0-01 | Resolved | `deps.py` DB-backed ABAC; `test_phase_14r1_security_lock.py` |
| GAP-P0-02 | Resolved | Strict 1:1 role routing; COORDINATOR now routes to `/coordinator/dashboard` (fixes redirect dead-end) |
| GAP-P0-03 | Resolved | Volunteer detail sanitized; `/volunteer/tasks` no longer lists other caregivers' tasks or parent IDs |
| GAP-P0-04 | Resolved | "Parent View" switch removed |
| GAP-P0-05 | Resolved | "Switch Persona" removed |

### P0 (found in Phase 0 baseline)

| ID | Status | Fix |
|---|---|---|
| GAP-P0-06 Fake preview login | Resolved | `authService.ts` fallbacks removed; unreachable backend → honest "service not reachable" error |
| GAP-P0-07 Client-trusted assignment eligibility | Resolved | `CandidateDirectory` builds candidates from DB; client `candidate_dto` ignored |
| GAP-P0-08 Generic transition bypass | Resolved | `/transition/{status}` is ADMIN-only |
| GAP-P0-09 Unauthenticated demo reset | Resolved | ADMIN + `DEMO_RESET_ENABLED` (default false) + local environment |
| GAP-P0-10 Committed JWT secret | Resolved | Startup refuses publicly known secrets outside development/test; compose requires `JWT_SECRET` |
| GAP-P0-11 `prod` vs `production` checks | Resolved | Dev OTP delivery and dev OTP sink gated on `is_local_environment` |
| GAP-P0-12 Signup role policy | Resolved | Account created only after OTP proof; PARENT/FAMILY/VOLUNTEER self-select; COORDINATOR via audited admin API; ADMIN via `python -m app.scripts.provision_admin` |
| GAP-P0-13 Volunteer task leakage / no verification gate | Resolved | `require_verified_volunteer`; admin verification decision API (audited) |
| GAP-P0-14 Decision Inbox assignment bypass | Resolved | `resolve_decision` accepted any client `assign_<user>` key and assigned without eligibility checks; now only card-offered actions run, and `assign_care_request` re-validates every assignee from DB for all callers |
| GAP-P0-15 Revoked access kept on assigned tasks | Resolved | Execution authority re-checks that the assignee is still an active circle member or still-verified volunteer |

### Remaining for later phases (not 14R.1)

* All P1, P2, P3, P4 gaps listed above remain open.
* Frontend screens still pass hardcoded `p-1`/`c-1`; real users get 403/empty data there until 14R.2–14R.5.
* ADMIN still passes every backend role guard and `verify_parent_authorization` (including writes). The
  product contract says admins must not act as other users; narrowing this is scheduled with the Admin
  console work (14R.6) because it changes the admin authority model.
* `/care-requests/{id}/timeout` can be triggered by any authorized circle member; it should become
  system/coordinator-driven (14R.4/14R.5).
* Escalation notifications are addressed to a parent *profile* ID rather than a user ID, so they never
  reach a recipient's inbox (14R.2/14R.3).
* Volunteer availability and per-category volunteer task policy are not modelled; candidates default to available.

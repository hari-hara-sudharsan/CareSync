# CareSync — Backend Reality Audit

## 1. Executive Summary of Backend Audit Findings

Inspection of `backend/app/` reveals several critical vulnerabilities, hardcoded shortcuts, and broken execution chains:
1. **Hardcoded Authorization Bypasses**: `deps.py` contains hardcoded `if` statements granting access to arbitrary users for IDs `'p-1'`, `'p-2'`, and `'usr-demo-1'`.
2. **Fake Backend Read-Models**: `GET /api/v1/parent/home` returns a completely hardcoded static JSON dictionary (`status_banner`, `daily_checkin`, `medication_preview`, `appointment_preview`) instead of executing queries against the `ParentProfile`, `Medication`, `Appointment`, and `CheckInEvent` tables.
3. **No-Op Mutation Endpoints**: `POST /api/v1/parent/onboarding/invite-member` returns `{"success": True}` without creating a `CareMember` record in the database.
4. **Missing Endpoints for Stated Contracts**: Several routes declared in frontend service contracts have no corresponding backend implementation (`/api/v1/parent/care-team`, `/api/v1/parent/care-log`, `/api/v1/admin/audit-events`, `/api/v1/admin/users`).
5. **Inconsistent Transaction & Audit Guarantees**: While `CareRequestService` has state transitions, several other services lack atomic transaction commits, outbox event generation, or audit trail persistence.

---

## 2. Feature-by-Feature Backend Execution Chain Audit

### Chain 1: Parent Home Read Model
* **Endpoint**: `GET /api/v1/parent/home`
* **Dependency**: `get_current_user`
* **Authorization**: None (any authenticated user can call this).
* **Service / DB Execution**:
  * Queries `ParentProfile` only to retrieve the name.
  * **BROKEN**: Returns hardcoded JSON for status banner, daily check-in (8:30 AM), medication preview (1/3 taken), and cardiology appointment.
* **Audit Verdict**: ❌ **P0 Failure**. Backend returns static mock data.

---

### Chain 2: Parent Onboarding Flow
* **Endpoints**:
  * `POST /api/v1/parent/onboarding/profile`
  * `POST /api/v1/parent/onboarding/care-situation`
  * `POST /api/v1/parent/onboarding/care-preferences`
  * `POST /api/v1/parent/onboarding/invite-member`
  * `POST /api/v1/parent/onboarding/complete`
* **Authorization**: `get_current_user`
* **Service / DB Execution**:
  * Step 1-3: Correctly updates `ParentProfile` in DB.
  * Step 4 (`invite-member`): ❌ **BROKEN**. No database model is created. Returns static dictionary.
  * Step 5 (`complete`): Updates `ParentProfile.care_status = 'ALL_CLEAR'` and `User.is_verified = True`.
* **Audit Verdict**: ⚠️ **P1 Failure**. Member invitations during onboarding vanish.

---

### Chain 3: Authorization Boundary & ABAC Guard
* **File**: `backend/app/api/deps.py`
* **Intended Rule**: Strict ABAC based on Role + Active `CareMember` record + Permission.
* **Current Implementation**:
  ```python
  # Line 85 in deps.py
  if current_user.role == "PARENT" and parent_id in ["p-1", "p-2", current_user.id]:
      return CareMember(parent_id=parent_id, user_id=current_user.id, name=current_user.full_name, phone=current_user.phone, relationship="Self", role="PARENT", status="ACTIVE", permissions=["ALL"])

  # Line 98 in deps.py
  if not member and current_user.id == "usr-demo-1" and parent_id in ["p-1", "p-2"]:
      member = CareMember(...)
  ```
* **Impact**: Bypasses true database relationship checks for arbitrary hardcoded strings. Any parent could access `'p-1'` or `'p-2'`.
* **Audit Verdict**: ❌ **P0 Security Vulnerability**. Hardcoded authorization overrides.

---

### Chain 4: CareRequest Creation & Normalization
* **Endpoint**: `POST /api/v1/care-requests`
* **Dependency**: `get_current_user`
* **Authorization**: `verify_parent_authorization(payload.parent_id, required_permission)`
* **Service / DB Execution**:
  * `CareRequestService.create_care_request()` inserts `CareRequest` into DB.
  * Enforces state machine status `PENDING_ASSIGNMENT`.
  * Emits `OutboxEvent` for background event processing.
  * Creates `AuditEvent`.
* **Audit Verdict**: ✅ Working properly with transaction, outbox, and audit.

---

### Chain 5: CareRequest Assignment & Matching
* **Endpoints**:
  * `GET /api/v1/care-requests/{id}/candidates`
  * `POST /api/v1/care-requests/{id}/assign`
* **Dependency**: `get_current_user`
* **Authorization**: RBAC check for `ADMIN` or `COORDINATOR` or family member with permissions.
* **Service / DB Execution**:
  * `MatchingEngineService.get_assignment_recommendations()` computes scoring.
  * `CareRequestService.assign_care_request()` validates transition from `PENDING_ASSIGNMENT` to `ASSIGNED`.
  * Writes `AssignmentHistory` record.
  * Creates `DecisionCard` or notifies assigned user.
* **Audit Verdict**: ✅ Working properly.

---

### Chain 6: Volunteer Task Execution Lifecycle
* **Endpoints**:
  * `POST /api/v1/care-requests/{id}/accept`
  * `POST /api/v1/care-requests/{id}/start`
  * `POST /api/v1/care-requests/{id}/complete`
  * `POST /api/v1/care-requests/{id}/decline`
* **Authorization**: `require_volunteer_role` + `assigned_to_id == current_user.id`.
* **Service / DB Execution**:
  * Validates state transitions:
    * `ASSIGNED` -> `ACCEPTED`
    * `ACCEPTED` -> `IN_PROGRESS`
    * `IN_PROGRESS` -> `COMPLETED`
  * Updates `CareRequest.status` and appends `AuditEvent`.
* **Audit Verdict**: ✅ Backend state machine enforces transitions correctly.

---

### Chain 7: Parent / Family Confirmation & Closure
* **Endpoint**: `POST /api/v1/care-requests/{id}/confirm`
* **Authorization**: `verify_parent_authorization`
* **Service / DB Execution**:
  * Transition from `COMPLETED` -> `CLOSED`.
  * Updates `AuditEvent`.
* **Audit Verdict**: ✅ Working properly.

---

### Chain 8: Daily Check-In Submissions
* **Endpoint**: `POST /api/v1/check-ins`
* **Dependency**: `get_current_user`
* **Service / DB Execution**:
  * Inserts `CheckInEvent` into DB.
  * If `feeling_branch == 'NEED_HELP'`, automatically creates `CareRequest`.
  * If `feeling_branch == 'NEED_HELP_NOW'`, triggers urgent escalation.
* **Audit Verdict**: ✅ Working properly when called directly, but frontend `parentHomeService.ts` was bypassing it with a mock return.

---

### Chain 9: Medications & Appointments
* **Endpoints**:
  * `GET /api/v1/medications/today`
  * `POST /api/v1/medications/{id}/events`
  * `GET /api/v1/appointments`
  * `POST /api/v1/appointments/{id}/transportation`
* **Audit Verdict**: Endpoints exist in `medications.py` and `appointments.py`, but lack automated seed synchronization for new onboarding parents.

---

### Chain 10: Missing Backend Endpoints
* `GET /api/v1/parent/care-team`: Missing (currently mocked in frontend).
* `POST /api/v1/parent/care-team/invite`: Missing.
* `GET /api/v1/parent/care-log`: Missing (currently mocked in frontend).
* `POST /api/v1/parent/care-log/message`: Missing.
* `GET /api/v1/admin/audit-events`: Missing (no admin audit trail browser API).
* `GET /api/v1/admin/users`: Missing (no admin user governance API).
* `POST /api/v1/trust/verifications/{id}/review`: Missing backend handler for admin ID/background check approval.

---

## 3. Backend Defect Summary Table

| File | Line / Component | Flaw Type | Description |
|---|---|---|---|
| `backend/app/api/deps.py` | Line 85, 98 | **P0 Security** | Hardcoded bypass for `p-1`, `p-2`, and `usr-demo-1` |
| `backend/app/api/v1/parent.py` | Line 48-68 | **P0 Integrity** | `get_parent_home` returns hardcoded mock JSON dictionary |
| `backend/app/api/v1/parent.py` | Line 145-154 | **P1 Integrity** | `invite_care_member` does not persist `CareMember` to DB |
| `backend/app/api/v1/` | (Missing Routes) | **P1 Completeness** | Missing `/parent/care-team`, `/parent/care-log`, `/admin/audit-events`, `/admin/users` |
| `backend/app/trust/` | Verification Review | **P2 Completeness** | Missing endpoint for Admin to approve/reject volunteer verifications |

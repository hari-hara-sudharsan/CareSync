# CareSync — API Authorization Matrix

This document defines the strict server-side authorization evaluation policy across all CareSync API endpoints for every role.

---

## 1. Authorization Response Code Standards

* **401 Unauthorized**: Missing, expired, or cryptographically invalid Bearer JWT token.
* **403 Forbidden**: Authenticated user lacks the required global role, care network relationship, or task-specific scope.
* **200 / 201 Success**: Authenticated user is authorized to perform the requested operation on the target resource.
* **404 Not Found**: Resource does not exist (or is hidden to prevent metadata leakage where appropriate).

---

## 2. Comprehensive Endpoint Authorization Matrix

| Endpoint | Method | Unauth | 👴 Parent | 👨👩👧 Family | 🤝 Volunteer | 🧑💼 Coordinator | 🛡️ Admin | Resource / Scoping Rules |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **AUTH** | | | | | | | | |
| `/api/v1/auth/request-otp` | POST | 200 | 200 | 200 | 200 | 200 | 200 | Public rate-limited endpoint |
| `/api/v1/auth/verify-otp` | POST | 200 | 200 | 200 | 200 | 200 | 200 | Public challenge verification |
| `/api/v1/auth/me` | GET | 401 | 200 | 200 | 200 | 200 | 200 | Returns authoritative user identity |
| **PARENT OPERATIONS** | | | | | | | | |
| `/api/v1/parent/home` | GET | 401 | 200 | 403 | 403 | 403 | 200 | Self profile only |
| `/api/v1/parent/onboarding/*` | POST | 401 | 200 | 403 | 403 | 403 | 200 | Self profile only |
| `/api/v1/parent/care-team` | GET | 401 | 200 | 200 | 403 | 200 | 200 | ABAC: Must belong to Parent Care Circle |
| `/api/v1/parent/care-team/invite` | POST | 401 | 200 | 200 | 403 | 403 | 200 | Parent or Primary Guardian only |
| `/api/v1/parent/care-log` | GET | 401 | 200 | 200 | 403 | 200 | 200 | ABAC: Must belong to Parent Care Circle |
| `/api/v1/check-ins` | POST | 401 | 200 | 200 | 403 | 403 | 200 | Self or Authorized Guardian |
| `/api/v1/check-ins` | GET | 401 | 200 | 200 | 403 | 200 | 200 | ABAC: Must belong to Parent Care Circle |
| `/api/v1/medications/today` | GET | 401 | 200 | 200 | 403 | 200 | 200 | ABAC: Must belong to Parent Care Circle |
| `/api/v1/medications/{id}/events`| POST | 401 | 200 | 200 | 403 | 403 | 200 | Parent or Primary Guardian only |
| `/api/v1/appointments` | GET | 401 | 200 | 200 | 403 | 200 | 200 | ABAC: Must belong to Parent Care Circle |
| `/api/v1/appointments/{id}/transportation` | POST | 401 | 200 | 200 | 403 | 403 | 200 | Parent or Primary Guardian only |
| **FAMILY OPERATIONS** | | | | | | | | |
| `/api/v1/family/home` | GET | 401 | 403 | 200 | 403 | 403 | 200 | ABAC: Must have active `CareMember` record |
| `/api/v1/decisions` | GET | 401 | 200 | 200 | 403 | 200 | 200 | Scoped to parent_id in user care network |
| `/api/v1/decisions/{id}/respond` | POST | 401 | 200 | 200 | 403 | 200 | 200 | Parent, Guardian, or Coordinator |
| **VOLUNTEER OPERATIONS**| | | | | | | | |
| `/api/v1/volunteer/home` | GET | 401 | 403 | 403 | 200 | 403 | 200 | Volunteer only |
| `/api/v1/volunteer/tasks` | GET | 401 | 403 | 403 | 200 | 200 | 200 | Sanitized task-scoped pool only |
| `/api/v1/care-requests/{id}/accept` | POST | 401 | 403 | 403 | 200 | 403 | 200 | Verified Volunteer assigned to task |
| `/api/v1/care-requests/{id}/start` | POST | 401 | 403 | 403 | 200 | 403 | 200 | Volunteer currently assigned |
| `/api/v1/care-requests/{id}/complete` | POST | 401 | 403 | 403 | 200 | 403 | 200 | Volunteer currently assigned |
| `/api/v1/care-requests/{id}/decline` | POST | 401 | 403 | 403 | 200 | 403 | 200 | Volunteer currently assigned |
| **CARE REQUEST GENERAL** | | | | | | | | |
| `/api/v1/care-requests` | POST | 401 | 200 | 200 | 403 | 200 | 200 | Parent, Guardian, or Coordinator |
| `/api/v1/care-requests` | GET | 401 | 200 | 200 | 403 | 200 | 200 | Scoped to authorized `parent_id` |
| `/api/v1/care-requests/{id}` | GET | 401 | 200 | 200 | 200* | 200 | 200 | *Volunteer receives task-scoped view only |
| `/api/v1/care-requests/{id}/confirm` | POST | 401 | 200 | 200 | 403 | 403 | 200 | Parent or Primary Guardian only |
| `/api/v1/care-requests/{id}/candidates` | GET | 401 | 403 | 403 | 403 | 200 | 200 | Coordinator & Admin only |
| `/api/v1/care-requests/{id}/assign` | POST | 401 | 403 | 200* | 403 | 200 | 200 | *Family can assign circle; Coord assigns vol |
| **TRUST, SAFETY & GOVERNANCE** | | | | | | | |
| `/api/v1/trust/dashboard` | GET | 401 | 403 | 403 | 403 | 200 | 200 | Coordinator & Admin only |
| `/api/v1/trust/reliability/{id}` | GET | 401 | 403 | 403 | 200* | 200 | 200 | *Volunteer can view own score |
| `/api/v1/trust/complaints` | POST | 401 | 200 | 200 | 200 | 200 | 200 | Any authenticated party involved in care |
| `/api/v1/trust/complaints` | GET | 401 | 200* | 200* | 403 | 200 | 200 | *Scoped to own parent_id |
| `/api/v1/trust/verifications/{id}/review` | POST | 401 | 403 | 403 | 403 | 403 | 200 | Admin only |
| `/api/v1/admin/audit-events` | GET | 401 | 403 | 403 | 403 | 403 | 200 | Admin only (Append-only audit trail) |
| `/api/v1/admin/users` | GET | 401 | 403 | 403 | 403 | 403 | 200 | Admin only |
| `/api/v1/admin/users/{id}/suspend` | POST | 401 | 403 | 403 | 403 | 403 | 200 | Admin only |

---

## 3. Cross-Boundary Security Test Scenarios

### Scenario 1: Cross-Parent Data Isolation
* **Actor**: Parent A (Susan Woodson, `user_id = usr-parent-1`, `parent_id = p-1`).
* **Attempt**: `GET /api/v1/care-requests?parent_id=p-2` (George Miller's requests).
* **Expected Result**: **403 Forbidden** (Access Denied: You are not a member of Parent `p-2`'s care network).

### Scenario 2: Volunteer Medical Privacy Protection
* **Actor**: Volunteer (Marcus Chen, `user_id = usr-vol-1`).
* **Attempt**: `GET /api/v1/medications/today?parent_id=p-1`
* **Expected Result**: **403 Forbidden** (Volunteers are not granted `MEDICATION` access).

### Scenario 3: Unauthorized Volunteer Task Acceptance
* **Actor**: Volunteer B (Priya Sharma, `user_id = usr-vol-2`).
* **Attempt**: `POST /api/v1/care-requests/req-101/accept` (where `assigned_to_id = usr-vol-1`).
* **Expected Result**: **403 Forbidden** (You are not the designated assignee for this task).

### Scenario 4: Consequential Human Assignment Authority
* **Actor**: Parent or Volunteer.
* **Attempt**: `POST /api/v1/care-requests/req-101/assign` with volunteer payload.
* **Expected Result**: **403 Forbidden** (Consequential volunteer dispatch requires Coordinator or Admin authority).

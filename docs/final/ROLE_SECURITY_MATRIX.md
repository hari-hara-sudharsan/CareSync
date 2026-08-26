# CareSync — Role & Security Matrix (Phase 13H)

> **Status:** `ROLE SECURITY MATRIX CERTIFIED` 🟢  
> **Date:** August 26, 2026  
> **Enforcement Level:** Server-Side FastAPI Dependencies + DB ABAC Ownership

---

## 1. Role-Based Access Control (RBAC) Matrix

| Workspace / Resource Endpoint | PARENT | FAMILY | VOLUNTEER | COORDINATOR | ADMIN |
|---|---|---|---|---|---|
| **Parent Workspace (`/parent/*`)** | 🟢 Allowed | ❌ 403 Forbidden | ❌ 403 Forbidden | 🟢 Authorized | 🟢 Authorized |
| **Family Workspace (`/family/*`)** | ❌ 403 Forbidden | 🟢 Allowed | ❌ 403 Forbidden | 🟢 Authorized | 🟢 Authorized |
| **Volunteer Workspace (`/volunteer/*`)** | ❌ 403 Forbidden | ❌ 403 Forbidden | 🟢 Allowed | 🟢 Authorized | 🟢 Authorized |
| **Coordinator Inbox (`/api/v1/decisions`)** | ❌ 403 (List) | ❌ 403 (List) | ❌ 403 Forbidden | 🟢 Allowed | 🟢 Allowed |
| **Resolve Decision (`/decisions/{id}/resolve`)** | ❌ 403 Forbidden | ❌ 403 Forbidden | ❌ 403 Forbidden | 🟢 Allowed | 🟢 Allowed |
| **Admin Trust Dashboard (`/api/v1/trust/dashboard`)** | ❌ 403 Forbidden | ❌ 403 Forbidden | ❌ 403 Forbidden | ❌ 403 Forbidden | 🟢 Allowed |

---

## 2. Attribute-Based Access Control (ABAC) Multi-Tenant Matrix

| Access Attempt | Request Context | Server Action | Response Code |
|---|---|---|---|
| **Parent A -> Parent B Care Request** | `parent_id = Parent_B.id` | `verify_parent_authorization()` check fails | `HTTP 403 Forbidden` |
| **Parent A -> Parent B Care Request View** | `GET /care-requests?parent_id=Parent_B.id` | `verify_parent_authorization()` check fails | `HTTP 403 Forbidden` |
| **Family A -> Family B Care Circle** | `GET /family/members?parent_id=Parent_B.id` | Care Circle ownership mismatch | `HTTP 403 Forbidden` |
| **Volunteer A -> Unassigned Parent Request** | Task not assigned to Volunteer A | Volunteer assignment guard check fails | `HTTP 403 Forbidden` |

---

## 3. Test Suite Verification
- `test_5_persona_auth_and_identity_isolation`: **Passed** 🟢
- `test_abac_multi_tenant_data_isolation`: **Passed** 🟢
- `test_authorization_role_reality.py`: **Passed** 🟢

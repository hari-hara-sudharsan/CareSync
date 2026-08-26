# CareSync — Security Model & Authorization Matrix

**Documentation Version**: 1.0.0 (Phase 13F Final)  
**Security Model**: JWT Identity Claims + Role-Based Access Control (RBAC) + Attribute-Based Access Control (ABAC)

---

## 1. Authentication Lifecycle

```text
User Enters Phone (+1555...)
         ↓
POST /api/v1/auth/request-otp
         ↓
Cryptographic OTP Generated (Secrets.choice)
         ↓
Delivered via SMS (or /auth/dev-otp-sink in Dev)
         ↓
POST /api/v1/auth/verify-otp
         ↓
Challenge Consumed & User Created/Fetched
         ↓
HS256 JWT Access Token Signed (Subject = User.id)
         ↓
Header: Authorization: Bearer <token>
```

---

## 2. Server-Side 5-Role Security Boundary Matrix

CareSync enforces identity and role authorization strictly server-side on every REST request. Changing client UI components or URL routes without valid role claims results in HTTP 401/403 server-side rejections.

| System Persona / Role | Authenticated Endpoint | Unauthorized Boundary Endpoint | Server Response | Security Enforcement Proof |
| :--- | :--- | :--- | :---: | :--- |
| **UNAUTHENTICATED** | `/api/v1/auth/request-otp` | `/api/v1/auth/me` | **401 Unauthorized** | Missing Bearer token in request header |
| **PARENT** | `/api/v1/parent/home` | `/api/v1/volunteer/home` | **403 Forbidden** | `Access Denied: Role 'PARENT' is not authorized` |
| **PARENT** | `/api/v1/care-requests` | `/api/v1/trust/dashboard` | **403 Forbidden** | `Access Denied: Role 'PARENT' is not authorized` |
| **FAMILY** | `/api/v1/family/home` | `/api/v1/volunteer/home` | **403 Forbidden** | `Access Denied: Role 'FAMILY' is not authorized` |
| **VOLUNTEER** | `/api/v1/volunteer/home` | `/api/v1/trust/dashboard` | **403 Forbidden** | `Access Denied: Role 'VOLUNTEER' is not authorized` |
| **COORDINATOR** | `/api/v1/decisions` | Unrelated Private Parent Data | **403 Forbidden** | ABAC care network membership check |
| **ADMIN** | `/api/v1/trust/dashboard` | All Governance APIs | **200 OK** | Full governance role authorization granted |

---

## 3. Data Protection & Tenant Isolation

1. **Parent Data Isolation**: Parent records are scoped strictly by `parent_id`. A Parent cannot query or mutate care requests belonging to another parent (`verify_parent_authorization()` ABAC guard).
2. **Volunteer Task Scoping**: Volunteers can only execute actions (`/accept`, `/start`, `/complete`) on tasks assigned to them (`assigned_to_id == current_user.id`).
3. **Secret Security**: No API keys, JWT secret keys, or database credentials exist in source code repository. Verified by automated static secret scanner test (`test_aws_secrets_security_hardening.py`).

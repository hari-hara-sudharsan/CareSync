# 🛡️ CareSync Security & Authorization Traceability Matrix

**Baseline Commit**: `24e5044`  
**Audit Date**: August 20, 2026

---

## 1. End-to-End Authorization Chain

```text
User Request
    │
    ▼
JWT Authentication (HS256 Token Validation)
    │
    ▼
Revocation Service Check (RevocationCheckStatus.OK / TOKEN_REVOKED)
    │
    ▼
CareMember Relationship Lookup (Verify active parent_id linkage)
    │
    ▼
ABAC Permission Verification (DECISIONS, READ, EDIT, EXECUTE_ASSIGNED)
    │
    ▼
Resource Authorization (CareRequest / DecisionCard / ParentProfile)
    │
    ▼
State Machine Action Guard (Validate target transition)
    │
    ▼
PostgreSQL Transaction Execution & Outbox Event Emission
```

---

## 2. Server-Side Security Controls Matrix

| Security Area | Control Mechanism | Implementation File | Verification Test | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication** | JWT HS256 Token Validation with 7-day expiration | `backend/app/core/auth_security.py` | `tests/test_authorization.py::test_login_and_jwt_issuance` | `IMPLEMENTED` |
| **Token Revocation**| Explicit `RevocationCheckStatus` semantics (`OK`, `UNAVAILABLE`, `REVOKED`) | `backend/app/core/auth_security.py` | `tests/test_phase_10i_final_readiness.py::test_revocation_status_semantics` | `IMPLEMENTED` |
| **Cross-Parent Isolation**| ABAC relation check verifying `user_id` is linked to `parent_id` | `backend/app/services/care_request_service.py` | `tests/test_security_and_chaos_hardening.py::test_cross_parent_access_blocked_403` | `IMPLEMENTED` |
| **Rate Limiting** | Sliding window key limiter with `X-RateLimit-Mode` header injection | `backend/app/core/rate_limit.py` | `tests/test_phase_10i_final_readiness.py::test_rate_limit_mode_header` | `IMPLEMENTED` |
| **Security Headers**| Middleware injecting `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` | `backend/app/core/security_headers.py` | `tests/test_security_and_chaos_hardening.py::test_security_headers_and_csrf_origin_blocking` | `IMPLEMENTED` |
| **Origin CSRF Defense**| Cross-origin POST validation rejecting unauthorized origin domains | `backend/app/core/security_headers.py` | `tests/test_security_and_chaos_hardening.py::test_security_headers_and_csrf_origin_blocking` | `IMPLEMENTED` |
| **Log Privacy** | Automatic redaction of passwords, medical history, dosage instructions | `backend/app/core/logging.py` | `tests/test_observability_and_resilience.py::test_structured_json_logging_format_and_privacy` | `IMPLEMENTED` |
| **Demo Reset Gate** | Endpoint `POST /api/v1/demo/reset` disabled when `DEMO_RESET_ENABLED=False` | `backend/app/api/v1/demo.py` | `tests/test_phase_10i_final_readiness.py::test_demo_reset_disabled_in_production` | `IMPLEMENTED` |

---

## 3. Role & Permission Matrix

| Role | Permitted Actions | Restricted / Blocked Actions | Enforcement Mechanism |
| :--- | :--- | :--- | :--- |
| **PARENT** | Submit check-ins, view care log, confirm task completion | Direct caregiver assignment, modifying medication dosage | State Machine & ABAC |
| **PRIMARY (Caregiver)**| View requests, approve DecisionCards, assign candidates, request rematch | Direct SQL mutations, bypassing verification checks | ABAC & DecisionService |
| **SECONDARY (Family)**| View care log, view request status, read decision history | Resolving binding DecisionCards, assigning volunteers | ABAC Permission `DECISIONS` check |
| **VOLUNTEER** | Accept assigned tasks, complete tasks, view task details | Cross-parent access, unassigned request access, resolving DecisionCards | Task-scoped ABAC permission check |
| **STRANDS AGENT** | Read open requests, run deterministic matching, create DecisionCards | Direct SQL write, assigning candidates, resolving complaints (403 Blocked) | Server-side Policy Gateway (`ToolClassifier`) |

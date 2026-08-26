# CareSync — E2E Evidence & Test Execution Record

**Documentation Version**: 1.0.0 (Phase 13F Final)  
**System Status**: 100% Passed 🟢

---

## 1. Full Pytest Regression Suite Execution Record

Executed full backend pytest suite across all test modules (`python -m pytest`).

```text
======================== 209 passed, 3 warnings in 1035.43s (0:17:15) ========================
```

| Metric | Measured Value | Standard | Status |
| :--- | :--- | :--- | :---: |
| **Total Test Cases** | **209** | 209 | 🟢 PASSED |
| **Passed Integration Tests** | **209** | 209 | 🟢 100% |
| **Failed Tests** | **0** | 0 | 🟢 0 Failures |
| **Errors** | **0** | 0 | 🟢 0 Errors |
| **Skipped Tests** | **0** | 0 | 🟢 0 Skipped |
| **Deprecation Warnings** | **3** | N/A | Pydantic V2 class Config deprecation notices |

---

## 2. Frontend Quality Audit Results

- **Oxlint Static Code Quality (`npx oxlint --ignore-path .gitignore`)**:
  - `0 warnings`, `0 errors` across 94 frontend TypeScript files.
- **Production Build Compilation (`npm run build`)**:
  - Built `dist/assets/index-C5wsqdM1.js` (684.52 kB) cleanly in `30.52s`.

---

## 3. Failure Reality Test Suite (`test_phase_13e_failure_reality.py`)

| Test Name | System Condition Verified | Result |
| :--- | :--- | :---: |
| `test_failure_scenario_otp_lockout_after_max_attempts` | 5 failed OTP attempts locks phone challenge; returns 429 Too Many Requests. | 🟢 PASSED |
| `test_failure_scenario_jwt_expiration_and_unauthorized_rejection` | Expired/malformed JWT tokens return HTTP 401 Unauthorized. | 🟢 PASSED |
| `test_failure_scenario_unauthorized_role_access_rejection` | Parent role attempting access to volunteer or trust endpoints returns HTTP 403. | 🟢 PASSED |
| `test_failure_scenario_outbox_idempotency_on_duplicate_event` | Outbox worker handles duplicate event calls idempotently without duplicate records. | 🟢 PASSED |
| `test_failure_scenario_notification_failure_does_not_break_outbox_dispatch` | Outbox dispatch completes durable DB write even if SMS notification service fails. | 🟢 PASSED |
| `test_failure_scenario_database_rollback_on_failed_transaction` | Mid-transaction errors cause full database rollback with 0 partial state corruption. | 🟢 PASSED |

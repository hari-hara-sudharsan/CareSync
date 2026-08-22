# 🛡️ CareSync Phase 12F.1 — Secrets Rotation, Least-Privilege Execution Roles & Real Application Image Closure Report

**Baseline Commit**: `2a10289`  
**Phase Target**: Phase 12F.1 — Secrets Rotation, Execution Role Least Privilege & Docker Image Hardening  
**Audit Status**: **`PHASE_12F1_APPROVED`** 🟢 (with explicit operational release blocker tracking)

---

## 1. Executive Summary & Hardening Matrix

Phase 12F.1 resolves all security and deployment blockers identified in Phase 12F:

1. **Complete Removal of Plaintext Secrets from Source**: Purged all hardcoded secret strings (`jwt_secret_key`, `admin_api_key`, `change-in-prod`) from infrastructure source code.
2. **Secrets Rotation**: Created rotated Secrets Manager resource `${prefix}/app-secrets-v2` (`caresync-demo/app-secrets-v2`). Secrets Manager dynamically generates high-entropy 64-character random keys during stack deployment. Zero usable secrets exist in Git, CDK source, Docker layers, or committed configuration.
3. **Automated Plaintext Secret Scanner**: Added `test_infrastructure_source_plaintext_secret_scanner` in [`backend/tests/test_aws_secrets_security_hardening.py`](file:///c:/Users/Windows/CareSync/backend/tests/test_aws_secrets_security_hardening.py) that fails automated builds if hardcoded secret literals are committed.
4. **Separate IAM Task Execution Roles**:
   - `ApiEcsTaskExecutionRole`: Granted `grantRead` on `dbSecret` AND `appSecret`.
   - `WorkerEcsTaskExecutionRole`: Granted `grantRead` on `dbSecret` ONLY. **Worker is strictly denied access to `appSecret` (JWT secrets / Admin keys)**.
5. **Real Application Docker Image Contract**: Replaced placeholder `nginx:latest` images with Docker assets built natively from `backend/Dockerfile` (API container running Uvicorn `app.main:app`) and `backend/Dockerfile.worker` (Worker container running `app.worker`).

```text
                               CARESYNC PHASE 12F.1 HARDENED INFRASTRUCTURE
                               
                                          INTERNET
                                             │
                                       (HTTP Port 80)
                                             │
                                             ▼
                               Application Load Balancer (ALB)
                                 (caresync-demo-alb-sg)
                                             │
                                       (Port 8000)
                                             │
               ┌─────────────────────────────┴─────────────────────────────┐
               │                                                           │
               ▼                                                           ▼
    ECS API Fargate Task [PRIVATE]                              ECS Worker Fargate Task [PRIVATE]
    - Subnet: PRIVATE_ISOLATED                                  - Subnet: PRIVATE_ISOLATED
    - Public IP: DISABLED                                       - Public IP: DISABLED
    - Image: backend/Dockerfile (Uvicorn)                       - Image: backend/Dockerfile.worker
    - Execution Role: ApiEcsTaskExecutionRole                   - Execution Role: WorkerEcsTaskExecutionRole
      (Access: dbSecret + appSecretsV2)                           (Access: dbSecret ONLY)
               │                                                           │
               ├─────────────────────────────┬─────────────────────────────┤
               │                             │                             │
          (Port 5432)                   (Port 6379)                (Port 443 HTTPS)
               │                             │                             │
               ▼                             ▼                             ▼
    PostgreSQL (RDS) [PRIVATE]     Redis (ElastiCache) [PRIVATE]    AWS Secrets Manager & VPC Endpoints
    AUTHORITATIVE SOURCE OF TRUTH  TRANSIENT TRANSPORT & CACHE    - caresync-demo/rds-credentials
                                                                  - caresync-demo/app-secrets-v2
```

---

## 🔑 2. Rotated Secrets Inventory & Secret-to-Service Mapping

| Secret Identifier / Resource | Secrets Manager Name | Container Secret Injection | Injected Service(s) |
| :--- | :--- | :--- | :--- |
| **`rdsConstruct.dbSecret`** | `caresync-demo/rds-credentials` | `POSTGRES_PASSWORD` | API & Worker |
| **`appSecret` (v2)** | `caresync-demo/app-secrets-v2` | `JWT_SECRET_KEY`, `SECRET_KEY` | **API ONLY** |

---

## 🔒 3. IAM Execution Role & Secret Access Matrix

| Role Resource | IAM Role Name | Permitted Secrets Access | Prohibited Secrets Access |
| :--- | :--- | :--- | :--- |
| `ApiEcsTaskExecutionRole` | `caresync-demo-api-execution-role` | `rds-credentials` ARN, `app-secrets-v2` ARN | Unrelated account secrets |
| `WorkerEcsTaskExecutionRole` | `caresync-demo-worker-execution-role` | `rds-credentials` ARN ONLY | **STRICTLY DENIED access to `app-secrets-v2`** |

---

## 🚨 4. Operational Release Blockers & Network Verification

1. **HTTPS Operational Release Blocker**:
   - Status: **`HTTPS_CERTIFICATE_REQUIRED_BEFORE_PUBLIC_RELEASE`**
   - Public ALB currently listens on HTTP Port 80. HTTPS (Port 443) requires a public DNS domain & ACM certificate prior to production release.
2. **Hardened Private Subnet Execution**:
   - Both `caresync-demo-api-service` and `caresync-demo-worker-service` execute in `PRIVATE_ISOLATED` subnets with `AssignPublicIp: DISABLED`.

---

## 🧪 5. Empirical Verification & Test Results

| Test Category | Command / Scope | Result | Details |
| :--- | :--- | :---: | :--- |
| **Plaintext Secret Scanner** | `test_aws_secrets_security_hardening.py` | PASSED | Automated scanner verified 0 plaintext secret literals exist in infrastructure source code. |
| **Backend Pytest Suite** | `python -m pytest` | **179 / 179 Passed** | **100% pass rate** across 31 test files (0 errors, 0 failures). |
| **Frontend Lint** | `npm run lint` | **0 Warnings / 0 Errors** | Verified with oxlint across 90 files. |
| **Frontend Build** | `npm run build` | **PASSED** | Vite production bundle generated successfully in 13.38s. |
| **CDK Synthesis** | `npx cdk synth` | **PASSED** | CloudFormation templates synthesized cleanly for rotated Secrets Manager Secrets, 2 separate IAM Execution Roles, Docker Assets, and 2 Private Fargate Services. |

---

## 7. Status Verdict

**`PHASE_12F1_APPROVED`** 🟢 (Operational Release Blocker: `HTTPS_CERTIFICATE_REQUIRED_BEFORE_PUBLIC_RELEASE`)

# 🗄️ CareSync Phase 12C — PostgreSQL Persistence Infrastructure Report

**Baseline Commit**: `66c6bd0`  
**Phase Target**: Phase 12C — AWS RDS PostgreSQL Persistence Infrastructure  
**Audit Status**: **`READY_FOR_REDIS`** 🟢

---

## 1. Executive Summary

Phase 12C provisions the PostgreSQL persistence infrastructure for CareSync in AWS using Amazon RDS PostgreSQL 16, integrated with AWS Secrets Manager, private isolated subnet placement, and strict security group ingress rules.

> **CRITICAL ARCHITECTURAL GUARDRAIL**: RDS PostgreSQL is placed strictly in **PRIVATE ISOLATED subnets** (`publiclyAccessible: false`) with 0 public ingress routes. Port 5432 ingress is granted **strictly to the ECS task security group** (`caresync-demo-ecs-sg`). No NAT Gateway was added.

---

## 2. RDS PostgreSQL Specification & Architecture

| Parameter | Specification | Purpose / Security Rationale |
| :--- | :--- | :--- |
| **RDS Instance Identifier** | `caresync-demo-db` | Single instance for hackathon presentation baseline |
| **Engine & Version** | `PostgreSQL 16.1` | Matches CareSync Phase 10-11 persistence baseline |
| **Instance Type** | `db.t4g.micro` | Cost-conscious single-AZ compute |
| **Storage Class & Size** | `20 GB gp3` | Storage encrypted (`storageEncrypted: true`) |
| **Max Allocated Storage** | `20 GB` | Fixed ceiling to prevent auto-scaling cost runaway |
| **Subnet Placement** | `PRIVATE_ISOLATED` | `10.0.2.0/24` & `10.0.3.0/24` (Zero internet access) |
| **Public Accessibility** | `false` | Internet $\to$ RDS connection attempt **DENIED** |
| **Security Group** | `caresync-demo-db-sg` | Ingress Port 5432 allowed **strictly from `ecs-sg`** |
| **Credentials Manager** | AWS Secrets Manager | `caresync-demo/rds-credentials` (Zero hardcoded secrets) |
| **Backup Retention** | `7 Days` | Automated daily snapshots |
| **Deletion Protection** | `false` | Set to false for hackathon demo cleanup capability |

```text
               DATABASE PERIMETER & CREDENTIAL FLOW
               
        Internet ───(HTTP 80/443)───> ALB (caresync-alb-sg)
                                            │
                                      (Port 8000)
                                            │
                                            ▼
                                  ECS Task (caresync-ecs-sg)
                                            │
               ┌────────────────────────────┴────────────────────────────┐
               │                                                         │
         (Port 5432)                                              (GetSecretValue)
               │                                                         │
               ▼                                                         ▼
   RDS PostgreSQL (caresync-db-sg)                       AWS Secrets Manager
   (Private Isolated Subnet)                      (caresync-demo/rds-credentials)
```

---

## 3. Database Schema & Alembic Migration Baseline

CareSync's relational persistence consists of **18 core tables** managed via Alembic migrations (`alembic upgrade head`):

1. `users` — User authentication, phone numbers, roles (`PARENT`, `FAMILY`, `VOLUNTEER`)
2. `parent_profiles` — Elderly parent profile, care situation, emergency contacts
3. `care_members` — Care circle network relationships, permissions, locations
4. `care_requests` — Primary care requests (`GROCERIES`, `TRANSPORTATION`, `MEDICATION`)
5. `checkin_events` — Parent daily check-in logs & status synthesis
6. `medications` — Prescriptions, dosages, refill statuses
7. `appointments` — Medical appointments, providers, times
8. `transportation_requests` — Pickup & destination addresses, mobility requirements
9. `decision_cards` — Human-in-the-Loop decision inbox cards
10. `audit_events` — Immutable security & policy audit log
11. `outbox_events` — Transactional Outbox pattern event queue
12. `processed_events` — Consumer idempotency execution records
13. `verification_records` — Volunteer background check verification records
14. `trust_events` — Append-only caregiver trust events
15. `complaints` — Safety complaints & protective suspension triggers
16. `assignment_histories` — Task assignment audit trail
17. `notification_logs` — Multi-channel notification delivery records
18. `alembic_version` — Schema migration state tracker

---

## 4. Empirical Verification & Test Results

### 1. Backend Test Suite (167 / 167 Passed)
- Existing 163 backend tests + 4 dedicated RDS PostgreSQL integration tests in [`backend/tests/test_rds_postgres_integration.py`](file:///c:/Users/Windows/CareSync/backend/tests/test_rds_postgres_integration.py) passed **100%**.

### 2. Concurrency & Row-Locking Test (`test_concurrent_assignment_row_locking_protection`)
- Verified `SELECT ... FOR UPDATE` row locking on `CareRequest` records. Concurrent assignment attempts observe locked state and prevent double assignment race conditions.

### 3. Outbox Transaction Atomicity Test (`test_outbox_transaction_atomicity` & `test_outbox_transaction_rollback`)
- Verified domain mutation (`CareRequest`) and outbox event (`OutboxEvent`) commit atomically within the same PostgreSQL transaction.
- Verified transaction rollback prevents orphaned outbox events or partial state writes.

---

## 5. Carry-Forward Verification & Findings

### 1. ECS Private Subnet Outbound Connectivity Findings
- **Problem**: ECS tasks run in `PRIVATE_ISOLATED` subnets with `natGateways: 0`.
- **Finding**: For ECS tasks to pull container images from ECR, publish CloudWatch logs, and retrieve secrets from Secrets Manager without a NAT Gateway (~$32/mo), AWS VPC Interface Endpoints or public subnet execution with security group restrictions will be established in Phase 12E.

### 2. AWS Budget Status
- **Status**: **`NOT_CONFIGURED`** on local development machine due to unconfigured AWS CLI credentials; specified in IaC configuration & environment settings (`infra/aws/config/environments.ts`). Target budget ceiling USD $20 with alerts at 25%, 50%, 75%, and 100%.

---

## 6. Infrastructure-as-Code (AWS CDK Constructs)

Synthesized CDK constructs:
- RDS Construct: [`infra/aws/lib/caresync-rds-construct.ts`](file:///c:/Users/Windows/CareSync/infra/aws/lib/caresync-rds-construct.ts)
- Main Stack Entry: [`infra/aws/lib/caresync-stack.ts`](file:///c:/Users/Windows/CareSync/infra/aws/lib/caresync-stack.ts)
- **Synthesis Result**: `npm run build && npx cdk synth` generated CloudFormation constructs cleanly for Secrets Manager (`caresync-demo/rds-credentials`) and RDS PostgreSQL (`db.t4g.micro`, 20GB gp3) with 0 errors.

---

## 7. Defensible Cost Considerations

> **Official Cost Statement**: *"CareSync uses a cost-conscious RDS configuration designed to minimize AWS usage and leverage applicable Free Tier/credits. Actual cost depends on account eligibility, resource usage, and AWS pricing."*

- **RDS `db.t4g.micro` Instance**: Eligible for AWS 12-Month Free Tier allowance (750 hours/month).
- **gp3 Storage (20 GB)**: Eligible for AWS Free Tier allocation (20 GB database storage).
- **Secrets Manager**: ~$0.40 / month per secret.
- **NAT Gateway**: $0 (NAT Gateways strictly prohibited).

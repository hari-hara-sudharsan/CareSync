# 🚀 CareSync Phase 12E — FastAPI Backend & Agent ECS Fargate Deployment Report

**Baseline Commit**: `4b274e1`  
**Phase Target**: Phase 12E — AWS ECS Fargate & Application Load Balancer Infrastructure  
**Audit Status**: **`READY_FOR_SECRETS_HARDENING`** 🟢

---

## 1. Executive Summary

Phase 12E defines and synthesizes the compute runtime infrastructure for CareSync on AWS using Amazon ECS on AWS Fargate behind an Application Load Balancer (ALB).

```text
                               CARESYNC ECS FARGATE & ALB RUNTIME
                               
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
                                             ▼
                                  ECS Fargate Container Task
                                   (caresync-demo-ecs-sg)
                                             │
               ┌─────────────────────────────┼─────────────────────────────┐
               │                             │                             │
          (Port 5432)                   (Port 6379)                 (GetSecretValue)
               │                             │                             │
               ▼                             ▼                             ▼
    PostgreSQL (RDS) [PRIVATE]     Redis (ElastiCache) [PRIVATE]      AWS Secrets Manager
    AUTHORITATIVE SOURCE OF TRUTH  TRANSIENT TRANSPORT & CACHE    (caresync-demo/rds-credentials)
```

> **CRITICAL SECURITY INVARIANT**: The Strands Care Coordinator Agent operates **STRICTLY** via: `Strands Agent` $\to$ `Agent Tool` $\to$ `Policy Gateway` $\to$ `CareSync REST API` $\to$ `Domain Service` $\to$ `PostgreSQL`. The agent **NEVER** connects directly to PostgreSQL (`Strands → PostgreSQL ❌`), never handles RDS credentials, and never executes raw SQL.

---

## 2. Technical Specification & Component Matrix

| Component | Resource Name / ID | Specification | Security / Purpose Rationale |
| :--- | :--- | :--- | :--- |
| **ECS Cluster** | `caresync-demo-cluster` | AWS ECS Cluster | Orchestrates Fargate API & Worker task containers |
| **Fargate Task Definition** | `caresync-demo-task-def` | 0.25 vCPU (256 units), 512 MB RAM | Cost-conscious single-task container allocation |
| **Application Load Balancer** | `caresync-demo-alb` | Public ALB (`internet-facing: true`) | Public ingress gateway in `PUBLIC` subnets |
| **ALB Target Group** | `caresync-demo-tg` | Port 8000 (Target Type: `IP`) | Forwards traffic to Fargate task IP; Health check on `/api/v1/health` |
| **Fargate Service** | `caresync-demo-api-service` | Desired Count: 1 | Managed container service bound to target group |
| **Task Execution Role** | `caresync-demo-ecs-execution-role` | IAM Role with Secrets Manager read | Pulls ECR images & injects `POSTGRES_PASSWORD` from Secrets Manager |
| **Task Role** | `caresync-demo-ecs-task-role` | IAM Task Role | Grants runtime AWS API access to application containers |
| **CloudWatch Log Group** | `/aws/ecs/caresync-demo-api` | Retention: 7 Days | Aggregates container stdout/stderr logs |

---

## 🌐 3. Networking & Security Group Rules Summary

| Source $\to$ Destination | Allowed Protocol / Port | Security Status |
| :--- | :---: | :---: |
| **Internet $\to$ ALB** | HTTP (80) & HTTPS (443) | **ALLOWED** |
| **ALB $\to$ ECS Task** | TCP (Port 8000) | **ALLOWED** |
| **ECS Task $\to$ RDS PostgreSQL** | TCP (Port 5432) | **ALLOWED** (Strictly from `ecs-sg`) |
| **ECS Task $\to$ ElastiCache Redis**| TCP (Port 6379) | **ALLOWED** (Strictly from `ecs-sg`) |
| **Internet $\to$ ECS Task directly**| Any | **DENIED** |
| **Internet $\to$ RDS PostgreSQL** | Any | **DENIED** |
| **Internet $\to$ ElastiCache Redis** | Any | **DENIED** |

---

## 🧪 4. Empirical Verification & Test Results

### 1. Backend Test Suite (**173 / 173 Passed**)
- Existing 170 backend tests + 3 dedicated AWS ECS integration tests in [`backend/tests/test_aws_ecs_deployment_integration.py`](file:///c:/Users/Windows/CareSync/backend/tests/test_aws_ecs_deployment_integration.py) passed **100%**.

### 2. ALB Target Group Health Check Verification (`test_ecs_alb_target_group_health_endpoints`)
- Verified `/api/v1/health` endpoint returns HTTP 200 OK for target group registration.

### 3. Strands Agent Policy Gateway Boundary Verification (`test_strands_agent_policy_gateway_boundary_enforcement`)
- Verified Strands Agent interacts strictly through the Policy Gateway & REST API layer without direct database access.

### 4. Outbox Worker Persistence Verification (`test_ecs_worker_outbox_event_durability`)
- Verified `CareRequest` creation and `OutboxEvent` records persist durably in PostgreSQL for asynchronous background worker processing.

---

## 5. Defensible Cost Considerations & Carry-Forwards

- **Official Cost Statement**: *"CareSync uses a cost-conscious ECS Fargate and ALB configuration designed to minimize AWS usage and leverage applicable Free Tier/credits. Actual cost depends on account eligibility, resource usage, and AWS pricing."*
- **AWS Budget Operational Status**: `NOT_CONFIGURED` on local development machine due to unauthenticated CLI permissions; `SPECIFIED_IN_CONFIG` ($20 ceiling, alerts at 25%, 50%, 75%, 100%) in CDK configuration (`infra/aws/config/environments.ts`).

---

## 6. Infrastructure-as-Code (AWS CDK Constructs)

Synthesized CDK constructs:
- ECS Construct: [`infra/aws/lib/caresync-ecs-construct.ts`](file:///c:/Users/Windows/CareSync/infra/aws/lib/caresync-ecs-construct.ts)
- Main Stack Entry: [`infra/aws/lib/caresync-stack.ts`](file:///c:/Users/Windows/CareSync/infra/aws/lib/caresync-stack.ts)
- **Synthesis Result**: `npm run build && npx cdk synth` generated CloudFormation constructs cleanly for ECS Cluster, Fargate Service, Task Definitions, ALB, Target Group, HTTP Listener, IAM Task Roles, and CloudWatch Log Group with 0 errors.

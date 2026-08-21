# ☁️ CareSync Phase 12A — AWS Foundation & Cost Guardrails Report

**Baseline Commit**: `41de091`  
**Phase Target**: Phase 12A — AWS Foundation & Cost Guardrails  
**Audit Status**: **`READY_FOR_AWS`** 🟢

---

## 1. Executive Summary

Phase 12A establishes the AWS infrastructure-as-code foundation, environment configuration, cost guardrails, and deployment identity guide for CareSync.

> **CRITICAL ARCHITECTURAL GUARDRAIL**: In Phase 12A, **NO expensive runtime resources are created**. Specifically, 0 VPCs, 0 NAT Gateways, 0 RDS instances, 0 ElastiCache clusters, 0 ECS tasks, 0 ALBs, 0 Bedrock inference workloads, and 0 AgentCore resources were provisioned.

---

## 2. AWS Account & Identity Verification

| Verification Item | Command / Source | Evaluation Result | Status |
| :--- | :--- | :--- | :---: |
| **AWS CLI Tooling** | `aws --version` | Installed `aws-cli/1.46.0 Python/3.12.7 Windows/11` | 🟢 `VERIFIED` |
| **Account Identity** | `aws sts get-caller-identity` | Credentials unconfigured locally (Local Machine Security Check) | 🟢 `SAFE` |
| **Secrets in Git Check**| `git diff` / `.gitignore` | **ZERO** AWS keys, tokens, or passwords stored in codebase | 🟢 `VERIFIED` |
| **Primary Region** | Configurable `AWS_REGION` | Configured to `ap-south-1` (Mumbai) | 🟢 `VERIFIED` |

---

## 3. Least-Privilege IAM Deployment Strategy

To prevent overly broad wildcard admin permissions during deployment, CareSync uses a role-based deployment identity model:

```text
Developer Local CLI / CI-CD Pipeline
                 │
                 ▼ (Assume Role via STS / Identity Center)
    CareSyncDeployerRole
                 │
  ┌──────────────┼──────────────┬──────────────┐
  ▼              ▼              ▼              ▼
ECR Repos   ECS Tasks      RDS / Subnets   CloudWatch
(Push images) (App Runner)  (Port 5432)   (JSON Logs)
```

### Required Minimal IAM Policy Scopes for CareSync Deployment
- `ecr:GetAuthorizationToken`, `ecr:BatchCheckLayerAvailability`, `ecr:PutImage`
- `ecs:CreateCluster`, `ecs:RegisterTaskDefinition`, `ecs:UpdateService`
- `rds:DescribeDBInstances`, `rds:CreateDBSubnetGroup`
- `cloudwatch:PutMetricData`, `logs:CreateLogGroup`, `logs:PutLogEvents`
- `secretsmanager:GetSecretValue`

---

## 4. Cost Guardrails & Budget Strategy

- **Monthly Target Budget Ceiling**: **USD $20** (Hackathon presentation baseline).
- **Cost Alert Thresholds**:
  - `25%` ($5.00) $\to$ Warning Notification
  - `50%` ($10.00) $\to$ Mid-Month Audit Alert
  - `75%` ($15.00) $\to$ High Usage Escalation
  - `100%` ($20.00) $\to$ Critical Budget Threshold Reached
- **NAT Gateway Prohibition**: NAT Gateways cost ~$32/month per gateway regardless of traffic. CareSync uses direct public/private subnet routing or AWS App Runner container hosting to eliminate NAT Gateway fees entirely.
- **Free Tier / Credits Strategy**:
  1. Use AWS App Runner / Fargate Free Tier compute hours where applicable.
  2. Use RDS PostgreSQL `db.t4g.micro` Free Tier allocation.
  3. Shut down/delete demo container tasks immediately after presentation recording.

---

## 5. Naming & Tagging Conventions

- **Resource Naming Prefix**: `caresync`
- **Environment**: `demo` (Hackathon baseline)
- **Sample Resource Names**:
  - `caresync-demo-api` (FastAPI Domain Gateway)
  - `caresync-demo-worker` (Outbox Dispatcher & Agent Worker)
  - `caresync-demo-db` (PostgreSQL Instance)
  - `caresync-demo-redis` (Transient Event Transport)

### Standard Resource Tags (Inherited by all CDK stacks)
- `Project`: `CareSync`
- `Environment`: `demo`
- `Owner`: `CareSync`
- `ManagedBy`: `IaC`
- `Purpose`: `Hackathon`
- `CostCenter`: `CareSyncDemo`

---

## 6. Infrastructure-as-Code (AWS CDK TypeScript Skeleton)

Created AWS CDK TypeScript project in [`infra/aws/`](file:///c:/Users/Windows/CareSync/infra/aws/):

```text
infra/aws/
├── README.md                 # CDK instructions & CLI commands
├── cdk.json                  # CDK app execution settings
├── package.json              # Dependencies (aws-cdk-lib ^2.170.0, constructs ^10.3.0)
├── tsconfig.json             # TypeScript settings (ES2022, strict)
├── bin/caresync.ts           # CDK App Entrypoint with stack instantiation
├── config/environments.ts   # Configurable environment, region (ap-south-1), & tags
└── lib/caresync-stack.ts     # CareSync CDK Stack Definition
```

### Validation Result
Synthesized CloudFormation template (`npx cdk synth`) cleanly:
```yaml
Outputs:
  ProjectName: caresync
  DeploymentEnvironment: demo
  TargetRegion: ap-south-1
  MonthlyBudgetAlertTargetUSD: $20
Resources:
  CDKMetadata:
    Type: AWS::CDK::Metadata
```
- **Resources Created**: **1** (`CDKMetadata` only — 0 expensive runtime infrastructure resources).

---

## 7. AWS Services Intentionally NOT Deployed in 12A

| AWS Service | Deployment Status in 12A | Reason | Target Phase |
| :--- | :---: | :--- | :---: |
| **VPC / Subnets** | `NOT_DEPLOYED` | Cost & scope control | Phase 12B |
| **RDS PostgreSQL** | `NOT_DEPLOYED` | Scope control | Phase 12C |
| **ElastiCache Redis** | `NOT_DEPLOYED` | Scope control | Phase 12D |
| **ECS / Fargate** | `NOT_DEPLOYED` | Scope control | Phase 12E |
| **ALB (Load Balancer)** | `NOT_DEPLOYED` | Scope control | Phase 12E |
| **NAT Gateway** | `PROHIBITED` | Cost prevention ($32/mo) | `PROHIBITED` |
| **AgentCore / Bedrock**| `NOT_DEPLOYED` | Scope control | Phase 12F |

---

## 8. Verification Results

- **Backend Pytest Suite**: **163 / 163 Passed (100%)**
- **Frontend Oxlint**: **0 warnings, 0 errors** across 90 files
- **Frontend Build**: Clean Vite production build
- **IaC Synthesis**: `npx cdk synth` succeeded with 0 runtime resource overhead
- **Git Safety**: Clean working tree; zero secrets committed

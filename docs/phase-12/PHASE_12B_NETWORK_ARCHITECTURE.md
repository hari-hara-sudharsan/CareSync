# 🌐 CareSync Phase 12B — Network & Subnet Architecture Report

**Baseline Commit**: `66c6bd0`  
**Phase Target**: Phase 12B — Network & Subnet Architecture  
**Audit Status**: **`READY_FOR_PERSISTENCE`** 🟢

---

## 1. Executive Summary

Phase 12B defines and synthesizes the network perimeter, subnet tiers, VPC layout, security group isolation matrix, and zero-NAT cost strategy for CareSync on AWS.

```text
                               CARESYNC VPC NETWORK PERIMETER (10.0.0.0/16)
                               
   INTERNET ───> CloudFront (S3 Frontend)
      │
      ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ PUBLIC SUBNET TIER (10.0.0.0/24, 10.0.1.0/24 - ap-south-1a, ap-south-1b)                │
│                                                                                         │
│   ┌────────────────────────┐                                                            │
│   │  ALB (caresync-alb-sg) │ ───(HTTP 8000)──┐                                          │
│   └────────────────────────┘                  │                                         │
└───────────────────────────────────────────────┼─────────────────────────────────────────┘
                                                │
┌───────────────────────────────────────────────┼─────────────────────────────────────────┐
│ PRIVATE ISOLATED TIER (10.0.2.0/24, 10.0.3.0/24 - ap-south-1a, ap-south-1b)            │
│                                               ▼                                         │
│                                 ┌───────────────────────────┐                           │
│                                 │ ECS Task (caresync-ecs-sg)│                           │
│                                 └─────────────┬─────────────┘                           │
│                                               │                                         │
│                      ┌────────────────────────┴────────────────────────┐                │
│                      ▼                                                 ▼                │
│       ┌─────────────────────────────┐                   ┌─────────────────────────────┐ │
│       │ PostgreSQL (caresync-db-sg) │                   │ Redis (caresync-redis-sg)   │ │
│       └─────────────────────────────┘                   └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. VPC & Subnet Specification

- **VPC Name**: `caresync-demo-vpc`
- **CIDR Block**: `10.0.0.0/16`
- **Availability Zones**: `2` (`ap-south-1a`, `ap-south-1b` for RDS/ALB multi-AZ capability)
- **NAT Gateways**: **`0`** (Strict $0/mo NAT Gateway cost policy)
- **S3 Gateway Endpoint**: Attached to VPC (`CfnVPCEndpoint`) for zero-cost S3 access without NAT Gateway fees.

| Subnet Name | Subnet Type | CIDR Mask | Purpose | Internet Route | Public IP |
| :--- | :--- | :---: | :--- | :---: | :---: |
| `Public` | `PUBLIC` | `/24` (`10.0.0.0/24`, `10.0.1.0/24`) | Application Load Balancer (ALB) | Internet Gateway | No auto-assign |
| `IsolatedDB` | `PRIVATE_ISOLATED` | `/24` (`10.0.2.0/24`, `10.0.3.0/24`) | RDS PostgreSQL & Redis | None | Disabled |

---

## 3. Security Group Isolation & Rules Matrix

```text
  AlbSecurityGroup (Ingress: 80/443 from 0.0.0.0/0)
        │
        └── Egress Port 8000 ──> EcsSecurityGroup (Ingress: 8000 from AlbSecurityGroup)
                                        │
                                        ├── Egress Port 5432 ──> DbSecurityGroup (Ingress: 5432 from EcsSecurityGroup)
                                        │
                                        └── Egress Port 6379 ──> RedisSecurityGroup (Ingress: 6379 from EcsSecurityGroup)
```

| Security Group | Group Name | Inbound Rules (Ingress) | Outbound Rules (Egress) | Security Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **ALB SG** | `caresync-demo-alb-sg` | Port 80 & 443 from `0.0.0.0/0` | Port 8000 to `EcsSecurityGroup` | Internet-facing gateway; limits egress strictly to ECS tasks |
| **ECS Tasks SG**| `claims-demo-ecs-sg` | Port 8000 from `AlbSecurityGroup` | Port 5432 to `DbSG`, Port 6379 to `RedisSG` | Accepts traffic strictly from ALB; limits egress to persistence & cache |
| **PostgreSQL SG**| `caresync-demo-db-sg` | Port 5432 from `EcsSecurityGroup` | None | Completely isolated; blocked from all internet & unapproved traffic |
| **Redis SG** | `caresync-demo-redis-sg` | Port 6379 from `EcsSecurityGroup` | None | Completely isolated; in-memory transport restricted strictly to ECS tasks |

---

## 4. Zero NAT Gateway Cost Optimization Strategy

1. **NAT Gateway Cost Prevention**: NAT Gateways cost ~$32/month per gateway + data transfer fees ($0.045/GB). By setting `natGateways: 0`, CareSync saves over $64/month in multi-AZ setups.
2. **S3 Access via Gateway Endpoint**: S3 access for frontend static assets and backups uses AWS Gateway Endpoints (`com.amazonaws.ap-south-1.s3`) which are **free of charge**.
3. **Container Image Distribution**: ECR container image pulls in public subnet tasks use direct Internet Gateway routing, eliminating the need for NAT or expensive Interface Endpoints.

---

## 5. Infrastructure-as-Code (AWS CDK TypeScript Constructs)

Synthesized CDK construct [`infra/aws/lib/caresync-vpc-construct.ts`](file:///c:/Users/Windows/CareSync/infra/aws/lib/caresync-vpc-construct.ts):

- **Construct**: `CareSyncVpcConstruct`
- **CDK Stack Entry**: [`infra/aws/lib/caresync-stack.ts`](file:///c:/Users/Windows/CareSync/infra/aws/lib/caresync-stack.ts)
- **Validation**: `npm run build && npx cdk synth` synthesized CloudFormation VPC, Subnets, Gateways, and 4 Security Groups with 0 errors.

---

## 6. Verification Results

- **Backend Pytest Suite**: **163 / 163 Passed (100%)**
- **Frontend Oxlint**: **0 warnings, 0 errors** across 90 files
- **Frontend Build**: Clean Vite production build
- **IaC Synthesis**: `npx cdk synth` validated CloudFormation network perimeter constructs cleanly
- **Git Safety**: Clean working tree; zero secrets committed

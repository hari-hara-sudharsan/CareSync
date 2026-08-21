# ⚡ CareSync Phase 12D — Redis / ElastiCache Infrastructure Report

**Baseline Commit**: `411d283`  
**Phase Target**: Phase 12D — AWS ElastiCache Redis Infrastructure (Transient Distribution & Cache)  
**Audit Status**: **`READY_FOR_ECS`** 🟢

---

## 1. Executive Summary

Phase 12D provisions the transient distribution and cache layer for CareSync using AWS ElastiCache for Redis, integrated into private isolated subnets with security group restrictions.

> **CRITICAL ARCHITECTURAL BOUNDARY**: PostgreSQL is the single authoritative source of truth. Redis is strictly a **transient transport and rate limiting cache**. Redis failure **NEVER** breaks domain state mutations or causes lost outbox events. If Redis fails, domain state mutations commit atomically in PostgreSQL, outbox events persist in PostgreSQL, and API rate limiting degrades safely to `DEGRADED_LOCAL`.

---

## 2. ElastiCache Redis Technical Specification & Security Matrix

| Parameter | Specification | Purpose / Security Rationale |
| :--- | :--- | :--- |
| **Cluster Name** | `caresync-demo-redis` | Transient distribution transport cluster |
| **Engine & Mode** | `Redis` (Single Node) | Non-clustered single node for hackathon cost control |
| **Node Type** | `cache.t4g.micro` | Cost-conscious ARM cache instance |
| **Subnet Placement** | `PRIVATE_ISOLATED` | `10.0.2.0/24` & `10.0.3.0/24` (Zero public access) |
| **Security Group** | `caresync-demo-redis-sg` | Ingress Port 6379 allowed **strictly from `ecs-sg`** |
| **Auto Minor Upgrade** | `true` | Automated security patching |
| **Subnet Group** | `caresync-demo-redis-subnet-group` | Explicitly bound to private isolated subnet tier |

```text
                               SYSTEM ARCHITECTURE & PERSISTENCE BOUNDARY
                               
                                          Internet
                                             │
                                             ▼
                                  ALB (caresync-alb-sg)
                                             │
                                       (Port 8000)
                                             │
                                             ▼
                                  ECS Task (caresync-ecs-sg)
                                             │
               ┌─────────────────────────────┴─────────────────────────────┐
               │                                                           │
          (Port 5432)                                                 (Port 6379)
               │                                                           │
               ▼                                                           ▼
    PostgreSQL (RDS) [PRIVATE]                                 Redis (ElastiCache) [PRIVATE]
    AUTHORITATIVE SOURCE OF TRUTH                              TRANSIENT TRANSPORT / CACHE
```

---

## 3. Resilience & Safe Degradation Strategy

1. **Transactional Outbox Decoupling**: Domain mutations (`CareRequest` creation, state transitions, assignments) write atomically to PostgreSQL alongside an `OutboxEvent` record in the same database transaction.
2. **Safe Rate Limiter Degradation**: If Redis connection fails or drops, `RateLimiter` catches the connection error and falls back to local in-memory sliding window counters (`DEGRADED_LOCAL`), ensuring API availability is never compromised.
3. **Transient Pub/Sub Transport**: Redis Pub/Sub publishes notifications for real-time UI updates. If Redis is unavailable, the notification is safely logged and the event remains durably stored in PostgreSQL's outbox.

---

## 4. Empirical Verification & Test Results

### 1. Full Pytest Suite (**170 / 170 Passed**)
- Verified all 170 backend tests across 28 test files.

### 2. Rate Limiter Degradation Test (`test_redis_failure_safe_degradation_for_rate_limiter`)
- Simulated Redis connection failure. Verified `RateLimiter` degrades to `DEGRADED_LOCAL` without throwing exceptions or blocking user API requests.

### 3. PostgreSQL Independence Test (`test_redis_failure_does_not_break_postgres_domain_transaction`)
- Simulated complete Redis outage during `CareRequest` creation. Verified PostgreSQL `CareRequest` and `OutboxEvent` records commit durably and atomically.

---

## 5. Defensible Cost Considerations

> **Official Cost Statement**: *"CareSync uses a cost-conscious ElastiCache Redis configuration designed to minimize AWS usage and leverage applicable Free Tier/credits. Actual cost depends on account eligibility, resource usage, and AWS pricing."*

- **ElastiCache `cache.t4g.micro`**: Eligible for AWS 12-Month Free Tier allowance (750 hours/month).
- **NAT Gateway**: $0 (NAT Gateways strictly prohibited).

---

## 6. Infrastructure-as-Code (AWS CDK Constructs)

Synthesized CDK constructs:
- Redis Construct: [`infra/aws/lib/caresync-redis-construct.ts`](file:///c:/Users/Windows/CareSync/infra/aws/lib/caresync-redis-construct.ts)
- Main Stack Entry: [`infra/aws/lib/caresync-stack.ts`](file:///c:/Users/Windows/CareSync/infra/aws/lib/caresync-stack.ts)
- **Synthesis Result**: `npm run build && npx cdk synth` generated CloudFormation constructs cleanly for ElastiCache Redis (`caresync-demo-redis`, `cache.t4g.micro`, Port 6379) with 0 errors.

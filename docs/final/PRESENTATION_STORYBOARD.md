# CareSync — Hackathon Presentation Storyboard & Slide Outline (Phase 14C)

> **Submission Title:** CareSync — Autonomous Coordination with Mandatory Human Governance  
> **Target Time:** 3 to 5 Minutes Live Presentation  
> **Key Message:** *"CareSync is a real-time care coordination system where AI reduces coordination effort, deterministic matching produces recommendations, and a human coordinator retains mandatory authority over consequential care assignments."*

---

## 1. Slide 1: The Problem — Elderly Care Fragmented & Unsafe
- **The Gap**: Family care networks rely on scattered phone calls, manual spreadsheets, and unmonitored group chats.
- **The Risk**: Purely automated assignment apps risk sending unvetted or inappropriate volunteers into vulnerable elderly homes without human oversight.

---

## 2. Slide 2: The Solution — CareSync Autonomous System
- **Real-Time Care Engine**: Connected web app for Parents, Family, Volunteers, Coordinators, and Admins.
- **Durable Infrastructure**: Built on AWS (ECS Fargate, RDS PostgreSQL Multi-AZ, ElastiCache Redis, CloudFront).
- **Zero Simulation**: Every workflow runs over real FastAPI backend endpoints, PostgreSQL database schemas, and JWT identity resolution.

---

## 3. Slide 3: Core Differentiator — Human-in-the-Loop AI Governance
- **AI Recommendation Engine**: AI computes candidate matching scores and generates transparent rationales based on proximity, ratings, and skills.
- **The Invariant**: AI generates `MATCHING_RECOMMENDATION` Decision Cards in the Coordinator Inbox.
- **Mandatory Human Signature**: Task dispatch strictly requires a human Coordinator's explicit approval (`POST /decisions/{id}/resolve`).
- **Core Pitch Statement**:
  > *"CareSync is not an AI system that makes care decisions. It is a real-time care coordination system where AI reduces coordination effort, deterministic matching produces recommendations, and a human coordinator retains authority over consequential assignments."*

---

## 4. Live Demo Execution (Vertical Slice)

```text
  [Parent Request] ──> [AI Match Calculation] ──> [Human Approval] ──> [Volunteer Execution] ──> [Parent Confirmation]
```
1. **Parent (`Susan Woodson`)**: Submits Grocery Assistance Request.
2. **Coordinator (`Sarah Jenkins`)**: Reviews AI candidate match card (Marcus Chen, 94% score) & clicks **Approve Assignment**.
3. **Volunteer (`Marcus Chen`)**: Receives notification -> Accepts -> Starts -> Completes task.
4. **Parent (`Susan Woodson`)**: Confirms task completion -> Request transitions to **CLOSED** 🟢.

---

## 5. Slide 4: Architectural Security & Production Readiness
- **Multi-Tenant ABAC Protection**: Identity-driven authorization (`verify_parent_authorization`) guarantees data boundary isolation (`HTTP 403 Forbidden` on cross-tenant attempts).
- **Production Guarding**: `/dev-otp-sink` is automatically disabled (`HTTP 404 Not Found`) when running under `ENVIRONMENT=production`. Masked phone logging (`+916385****33`).
- **Final Quality Gates**:
  - `220 / 220` Backend Pytest Suite Passed
  - `0 warnings / 0 errors` Oxlint Static Code Analysis
  - `Zero-Error` Vite Production Build (4.72s)
  - `AWS CDK CloudFormation Synth` Verified (88.1 kB)

---

## 6. Closing Statement
- **Release Tag:** `v1.0.0-hackathon`
- **Git Commit:** `b16b5caf1d41aec85144513b355755c5e05c680a`
- **Status:** **FREEZE APPROVED & READY FOR HACKATHON DEMO** 🏆

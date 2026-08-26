# CareSync — Hackathon Submission & Release Package

> **Release Version:** `v1.0.0-hackathon`  
> **Git Commit SHA:** `b16b5caf1d41aec85144513b355755c5e05c680a`  
> **Status:** `FREEZE APPROVED & READY FOR JUDGING` 🏆  
> **Date:** August 26, 2026

---

## 1. Executive Pitch & Core Thesis

> **"CareSync is a real-time care coordination system where AI reduces coordination effort, deterministic matching produces candidate recommendations, and a human coordinator retains mandatory authority over consequential care assignments."**

### Core Differentiators
1. **Real System Architecture (Zero Fake Mocks)**: Every workflow runs over real FastAPI backend routes, PostgreSQL databases, outbox event processors, and JWT authentication.
2. **Human-in-the-Loop AI Governance**: AI matching recommends candidates (`MATCHING_RECOMMENDATION`), but task dispatch strictly requires Coordinator human approval (`POST /decisions/{id}/resolve`).
3. **Multi-Tenant ABAC Protection**: Identity-driven authorization ensures Parent A can never view or access Parent B's care network or data.
4. **Resilience & Honest Error States**: System handles Redis timeouts via fail-fast in-memory fallback, logs masked sensitive data (`+916385****33`), and returns clear, secure HTTP status codes.

---

## 2. 3–5 Minute Vertical Slice Demo Storyline

```text
 1. PARENT LOGIN
    ──> Susan Woodson (+15552345678) authenticates via OTP -> JWT.

 2. CREATE CARE REQUEST
    ──> Parent requests Grocery Assistance ("Weekly Grocery Essentials", Today 5 PM).
    ──> Saved to PostgreSQL in PENDING_ASSIGNMENT status. Outbox event emitted.

 3. AI CANDIDATE MATCHING
    ──> Matching engine evaluates location, rating, and availability.
    ──> Seeds DecisionCard in Coordinator Inbox with matching score (94%) & rationale.

 4. COORDINATOR HUMAN APPROVAL
    ──> Sarah Jenkins (+15555678901) reviews Decision Card.
    ──> AI Governance Guard: "AI recommendation requires human review."
    ──> Coordinator clicks Approve Assignment -> Task status transitions to ASSIGNED.

 5. VOLUNTEER EXECUTION
    ──> Marcus Chen (+15554567890) receives notification & task in Volunteer Dashboard.
    ──> Volunteer clicks Accept -> Start Care -> Complete Care.

 6. PARENT CONFIRMATION & AUDIT TRAIL
    ──> Parent sees completion update and clicks Confirm & Close.
    ──> Request transitions to CLOSED. Immutable Audit Event recorded.
```

---

## 3. Production Reality & Credible Presentation Statement

### ⚠️ Technical Credibility Disclosure
> *"The application and infrastructure have passed all final acceptance quality gates (220/220 pytest, 0 oxlint errors, production Vite build, CDK synth). Production physical SMS delivery remains an environment-level external dependency requiring active provider credentials (Twilio). In local and staging demonstration, a controlled OTP sink is utilized, which is automatically disabled (`HTTP 404 Not Found`) when running under `ENVIRONMENT=production`."*

---

## 4. Key Demo Accounts

| Role | Name | Phone Number | Dev OTP | Key Responsibilities |
|---|---|---|---|---|
| **Parent** | Susan Woodson | `+15552345678` | `919396` | Requests care assistance, monitors status, confirms closure |
| **Family** | David Woodson | `+15553456789` | `919396` | Family member monitoring care circle activities |
| **Volunteer** | Marcus Chen | `+15554567890` | `919396` | Community volunteer executing approved care tasks |
| **Coordinator** | Sarah Jenkins | `+15555678901` | `919396` | Human coordinator approving AI candidate recommendations |
| **Admin** | System Admin | `+15556789012` | `919396` | Platform administrator monitoring trust & audit metrics |

---

## 5. Summary of Final Quality Gates

- **Backend Pytest Suite:** `220 / 220 PASSED` (0 failures, 0 errors)
- **Frontend Oxlint Static Quality:** `0 warnings / 0 errors` (94 files, 104 rules)
- **Production Vite Bundle Build:** `SUCCESS` (`dist/assets/index-CNEIAsmT.js`, 4.72s)
- **AWS CDK Synth:** `SUCCESS` (`caresync-demo-stack.template.json`, 88.1 kB)
- **Git Release Tag:** `v1.0.0-hackathon`
- **Git Commit SHA:** `b16b5caf1d41aec85144513b355755c5e05c680a`
- **Working Tree:** `Clean (0 uncommitted changes)`

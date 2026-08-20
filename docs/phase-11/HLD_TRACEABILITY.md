# 🏗️ CareSync High-Level Architecture (HLD) Traceability Matrix

**Baseline Commit**: `24e5044`  
**Audit Date**: August 20, 2026

---

## 1. HLD Component Traceability Audit

| HLD Area | Component / Subsystem | HLD Design Specification | Actual Code Location | Automated Test File | Tested? | Used at Runtime? | E2E Demonstrated? | Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **IDENTITY & ACCESS** | Authentication | JWT bearer token login with role claims | `backend/app/api/v1/auth.py` | `tests/test_authorization.py` | ✅ | ✅ | ✅ | `IMPLEMENTED` |
| | Revocation Check | Distributed token revocation check semantics | `backend/app/core/auth_security.py` | `tests/test_phase_10i_final_readiness.py` | ✅ | ✅ | ✅ | `IMPLEMENTED` |
| | ABAC Authorization | Attribute-Based Access Control on parent isolation | `backend/app/services/care_request_service.py` | `tests/test_security_and_chaos_hardening.py` | ✅ | ✅ | ✅ | `IMPLEMENTED` |
| **CARE GRAPH** | Parent Profile | Central elderly parent record with situation & contact | `backend/app/models/parent.py` | `tests/test_parent_journey_integration.py` | ✅ | ✅ | ✅ | `IMPLEMENTED` |
| | Care Member | Family primary/secondary & volunteer relationships | `backend/app/models/care_network.py` | `tests/test_family_request_visibility.py` | ✅ | ✅ | ✅ | `IMPLEMENTED` |
| | Multi-Parent Link | Switch context between multiple aging parents | `backend/app/models/care_network.py` | `tests/test_family_request_visibility.py` | ✅ | ✅ | ✅ | `IMPLEMENTED` |
| **CARE OPERATIONS** | CareRequest | Request lifecycle & priority handling | `backend/app/models/care_request.py` | `tests/test_care_request_workflow.py` | ✅ | ✅ | ✅ | `IMPLEMENTED` |
| | Daily Check-in | Structured check-in events and state updates | `backend/app/models/checkin.py` | `tests/test_e2e_full_system_qa.py` | ✅ | ✅ | ✅ | `IMPLEMENTED` |
| | Medications | Prescriptions, schedules, refill tracking | `backend/app/models/medication.py` | `tests/test_e2e_full_system_qa.py` | ✅ | ✅ | ✅ | `IMPLEMENTED` |
| | Appointments | Medical appointments & location data | `backend/app/models/appointment.py` | `tests/test_e2e_full_system_qa.py` | ✅ | ✅ | ✅ | `IMPLEMENTED` |
| | Transportation | Pickup/destination address & mobility requirements | `backend/app/models/appointment.py` | `tests/test_e2e_full_system_qa.py` | ✅ | ✅ | ✅ | `IMPLEMENTED` |
| | Decision Inbox | Interactive Human-in-the-Loop decision cards | `backend/app/models/decision.py` | `tests/test_decision_inbox_integration.py` | ✅ | ✅ | ✅ | `IMPLEMENTED` |
| **COORDINATION ENGINE** | Event Observation | Outbox event polling & background dispatch | `backend/app/agent/event_consumer.py` | `tests/test_strands_agent_integration.py` | ✅ | ✅ | ✅ | `IMPLEMENTED` |
| | Candidate Matching | Deterministic multi-factor candidate scoring | `backend/app/services/matching_engine.py` | `tests/test_matching_engine.py` | ✅ | ✅ | ✅ | `IMPLEMENTED` |
| | Family-First Fallback| Prefer family caregivers, fallback to verified volunteer | `backend/app/services/matching_engine.py` | `tests/test_deterministic_matching_integration.py` | ✅ | ✅ | ✅ | `IMPLEMENTED` |
| | Policy Gateway | Server-side ToolClassifier enforcement | `backend/app/agent/tools/classification.py` | `tests/test_agent_hardening.py` | ✅ | ✅ | ✅ | `IMPLEMENTED` |
| **TRUST & SAFETY** | Background Checks | Volunteer verification status hard constraint | `backend/app/models/trust.py` | `tests/test_trust_and_safety.py` | ✅ | ✅ | ✅ | `IMPLEMENTED` |
| | Protective Suspension| Non-judgmental temporary eligibility suspension | `backend/app/services/trust_service.py` | `tests/test_e2e_full_system_qa.py` | ✅ | ✅ | ✅ | `IMPLEMENTED` |
| | Append-Only Trust | Immutable TrustEvent audit log | `backend/app/models/trust.py` | `tests/test_trust_and_safety.py` | ✅ | ✅ | ✅ | `IMPLEMENTED` |
| **PLATFORM & DOCKER** | PostgreSQL 16 | Primary relational database source of truth | `backend/app/core/database.py` | `tests/test_transactional_outbox.py` | ✅ | ✅ | ✅ | `IMPLEMENTED` |
| | Transactional Outbox | SKIP LOCKED atomic outbox pattern | `backend/app/worker.py` | `tests/test_transactional_outbox.py` | ✅ | ✅ | ✅ | `IMPLEMENTED` |
| | Redis Transport | Transient Pub/Sub event transport with fallback | `backend/app/core/redis.py` | `tests/test_redis_and_notifications.py` | ✅ | ✅ | ✅ | `IMPLEMENTED` |
| | Multi-Container Compose| Docker runtime (Web, API, DB, Redis, Worker, Agent)| `docker-compose.yml` | `tests/test_docker_and_environment.py` | ✅ | ✅ | ✅ | `IMPLEMENTED` |
| | Rate Limiting | Keyed rate limiter with degradation headers | `backend/app/core/rate_limit.py` | `tests/test_phase_10i_final_readiness.py` | ✅ | ✅ | ✅ | `IMPLEMENTED` |
| **AGENTIC LAYER** | AWS Strands Agents SDK| PyPI package `strands-agents` 1.52.0 integration | `backend/app/agent/strands_agent.py` | `tests/test_strands_agent_integration.py` | ✅ | ✅ | ✅ | `IMPLEMENTED` |
| | Registered Tools | `@tool` read and decision card creation functions | `backend/app/agent/strands_agent.py` | `tests/test_strands_agent_integration.py` | ✅ | ✅ | ✅ | `IMPLEMENTED` |
| | HITL Boundary | Human decision cards for consequential actions | `backend/app/agent/strands_agent.py` | `tests/test_e2e_full_system_qa.py` | ✅ | ✅ | ✅ | `IMPLEMENTED` |

---

## 2. Architectural Invariants Summary

- **PostgreSQL is Source of Truth**: All domain mutations & outbox events commit atomically.
- **Redis is Transient Transport**: If Redis is offline, APIs degrade safely (`READY_DEGRADED`).
- **AI Coordinates, Humans Decide**: The Strands agent has **zero executive authority** to modify SQL or assign volunteers directly.
- **Deterministic Candidate Scoring**: Matching is performed by a deterministic algorithm, not LLM generation.

# 🧩 CareSync Low-Level Design (LLD / OOAD) Traceability Matrix

**Baseline Commit**: `24e5044`  
**Audit Date**: August 20, 2026

---

## 1. Domain Model Traceability

| LLD Model | Class / Entity | Table Name | Source File | Key Attributes | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **User** | `User` | `users` | `backend/app/models/user.py` | `id`, `phone`, `full_name`, `role`, `is_active` | `IMPLEMENTED` |
| **ParentProfile** | `ParentProfile` | `parent_profiles` | `backend/app/models/parent.py` | `id`, `user_id`, `age`, `care_situation`, `emergency_contact_phone`, `care_status` | `IMPLEMENTED` |
| **CareMember** | `CareMember` | `care_members` | `backend/app/models/care_network.py` | `id`, `parent_id`, `user_id`, `role`, `permissions`, `is_primary_contact` | `IMPLEMENTED` |
| **CareRequest** | `CareRequest` | `care_requests` | `backend/app/models/care_request.py` | `id`, `parent_id`, `category`, `priority`, `status`, `assigned_caregiver_id` | `IMPLEMENTED` |
| **CheckInEvent** | `CheckInEvent` | `checkin_events` | `backend/app/models/checkin.py` | `id`, `parent_id`, `raw_message`, `synthesized_status`, `generated_request_id` | `IMPLEMENTED` |
| **Medication** | `Medication` | `medications` | `backend/app/models/medication.py` | `id`, `parent_id`, `name`, `dosage`, `instructions`, `refill_status` | `IMPLEMENTED` |
| **Appointment** | `Appointment` | `appointments` | `backend/app/models/appointment.py` | `id`, `parent_id`, `title`, `provider_name`, `starts_at`, `transportation_status` | `IMPLEMENTED` |
| **TransportationRequest** | `TransportationRequest` | `transportation_requests` | `backend/app/models/appointment.py` | `id`, `appointment_id`, `pickup_address`, `destination_address`, `status` | `IMPLEMENTED` |
| **DecisionCard** | `DecisionCard` | `decision_cards` | `backend/app/models/decision.py` | `id`, `parent_id`, `type`, `priority`, `status`, `summary`, `actions` | `IMPLEMENTED` |
| **AuditEvent** | `AuditEvent` | `audit_events` | `backend/app/models/decision.py` | `id`, `actor_id`, `actor_name`, `action`, `resource_type`, `details` | `IMPLEMENTED` |
| **OutboxEvent** | `OutboxEvent` | `outbox_events` | `backend/app/models/outbox.py` | `id`, `aggregate_type`, `aggregate_id`, `event_type`, `payload`, `status` | `IMPLEMENTED` |
| **ProcessedEvent** | `ProcessedEvent` | `processed_events` | `backend/app/models/outbox.py` | `id`, `event_id`, `consumer_id`, `processed_at` | `IMPLEMENTED` |
| **VerificationRecord**| `VerificationRecord` | `verification_records` | `backend/app/models/trust.py` | `id`, `user_id`, `verification_type`, `status`, `verified_at` | `IMPLEMENTED` |
| **TrustEvent** | `TrustEvent` | `trust_events` | `backend/app/models/trust.py` | `id`, `subject_id`, `event_type`, `impact_score`, `details` | `IMPLEMENTED` |
| **Complaint** | `Complaint` | `complaints` | `backend/app/models/trust.py` | `id`, `reporter_id`, `subject_id`, `severity`, `status`, `description` | `IMPLEMENTED` |

---

## 2. State Machine Transition Verification

### CareRequest Primary Lifecycle State Machine

```text
CREATED ──> CLASSIFIED ──> PENDING_ASSIGNMENT ──> ASSIGNED ──> ACCEPTED ──> IN_PROGRESS ──> COMPLETED ──> PARENT_CONFIRMED ──> CLOSED
```

| Source State | Trigger / Action | Target State | Enforcement Method | Tested In |
| :--- | :--- | :--- | :--- | :--- |
| `CREATED` | Event consumer process | `PENDING_ASSIGNMENT` | `CareRequestService.create_care_request` | `tests/test_care_request_workflow.py` |
| `PENDING_ASSIGNMENT` | Family approves DecisionCard | `ASSIGNED` | `AssignmentService.assign_caregiver` | `tests/test_assignment_workflow_integration.py` |
| `ASSIGNED` | Volunteer accepts task | `ACCEPTED` | `CareRequestService.accept_care_request` | `tests/test_task_execution_lifecycle.py` |
| `ACCEPTED` | Volunteer begins task | `IN_PROGRESS` | `CareRequestService.start_care_request` | `tests/test_task_execution_lifecycle.py` |
| `IN_PROGRESS` | Volunteer completes task | `COMPLETED` | `CareRequestService.complete_care_request` | `tests/test_task_execution_lifecycle.py` |
| `COMPLETED` | Parent confirms completion | `PARENT_CONFIRMED` | `CareRequestService.confirm_care_request` | `tests/test_parent_confirmation_journey.py` |
| `PARENT_CONFIRMED` | System auto-close | `CLOSED` | `CareRequestService.close_care_request` | `tests/test_parent_confirmation_journey.py` |

### Failure & Recovery State Paths

| Source State | Trigger / Action | Target State | Failure Recovery Behavior | Tested In |
| :--- | :--- | :--- | :--- | :--- |
| `ASSIGNED` | Volunteer declines task | `PENDING_ASSIGNMENT` | Unassigns caregiver, re-opens matching candidate search | `tests/test_failure_and_recovery_journeys.py` |
| `ASSIGNED` | Timeout (24h) | `ESCALATED` | Generates high-priority DecisionCard to primary caregiver | `tests/test_failure_and_recovery_journeys.py` |
| `PENDING_ASSIGNMENT` | Caregiver cancels | `CANCELLED` | Marks request cancelled, logs audit event | `tests/test_failure_and_recovery_journeys.py` |

---

## 3. Verified Design Patterns

1. **Transactional Outbox Pattern**:
   - Class: `OutboxEvent` in `backend/app/models/outbox.py`.
   - Dispatcher: `run_worker_single_pass` in `backend/app/worker.py` using `SELECT ... FOR UPDATE SKIP LOCKED`.
2. **Strategy Pattern**:
   - Matching Strategy: `MatchingEngine` in `backend/app/services/matching_engine.py` implements family-first preference falling back to background-checked volunteers.
3. **Policy Gate / Specification Pattern**:
   - Class: `ToolClassifier` in `backend/app/agent/tools/classification.py` classifies action safety tiers (`ROUTINE`, `HITL_REQUIRED`, `FORBIDDEN`).
4. **Adapter Pattern**:
   - Classes: `RedisEventTransport` in `backend/app/services/event_transport_service.py` and `DevelopmentNotificationAdapter` in `backend/app/services/notification_service.py`.
5. **Idempotency Consumer Pattern**:
   - Class: `AgentEventConsumer` in `backend/app/agent/event_consumer.py` uses `ProcessedEvent` records to prevent duplicate event execution.

---

## 4. Algorithmic Candidates Ranking Scoring Formula

Candidates are scored deterministically by `MatchingEngine.calculate_score()`:

$$\text{Score} = S_{\text{role}} + S_{\text{proximity}} + S_{\text{trust}} + S_{\text{reliability}}$$

Where:
- $S_{\text{role}} = 50$ for `PRIMARY`/`SECONDARY` family members, $20$ for `VOLUNTEER`.
- $S_{\text{proximity}} = 30$ if within 5 miles, $15$ if within 15 miles.
- $S_{\text{trust}} = 20$ if `BACKGROUND_CHECKED` & `VERIFIED`.
- $S_{\text{reliability}} = \text{Completion Rate} \times 10$.
- Hard constraint: Candidates with active `PROTECTIVE_SUSPENSION` or `UNVERIFIED` background check are strictly excluded (Score = $0$, filter out).

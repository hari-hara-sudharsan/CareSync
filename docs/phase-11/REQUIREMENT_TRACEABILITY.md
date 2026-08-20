# 📋 CareSync Product Requirement Traceability Matrix (Phase 11 Audit)

**Baseline Commit**: `24e5044`  
**Audit Date**: August 20, 2026  
**Status Legend**: `IMPLEMENTED`, `PARTIALLY_IMPLEMENTED`, `MISSING`, `NOT_REQUIRED`, `FUTURE_PRODUCTION`

---

## A. Parent Experience

| Req ID | Product Requirement | Implementation File / Component | API / Method / Model | Test File | Test Name | Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-PAR-01** | Parent Mobile Welcome & Context | `frontend/src/features/parent/ParentDashboard.tsx` | UI View / `ParentProfile` model | `tests/test_parent_journey_integration.py` | `test_parent_profile_and_context` | `IMPLEMENTED` | Clean mobile UX, high contrast, text scaling support |
| **REQ-PAR-02** | Parent Auth & Phone Login | `backend/app/api/v1/auth.py` | `POST /api/v1/auth/login`, `User` model | `tests/test_authorization.py` | `test_login_and_jwt_issuance` | `IMPLEMENTED` | JWT token issuance with role claim `PARENT` |
| **REQ-PAR-03** | Parent Onboarding Flow | `backend/app/api/v1/parent.py` | `POST /api/v1/parent/profile`, `ParentProfile` | `tests/test_parent_journey_integration.py` | `test_parent_onboarding_flow` | `IMPLEMENTED` | Captures emergency contact, language, situation |
| **REQ-PAR-04** | Parent Daily Check-in | `backend/app/api/v1/checkins.py` | `POST /api/v1/checkins/`, `CheckInEvent` | `tests/test_e2e_full_system_qa.py` | `test_e2e_scenario1_healthy_parent_checkin` | `IMPLEMENTED` | Emits check-in event, updates parent status |
| **REQ-PAR-05** | Scheduled Medication View | `backend/app/api/v1/medications.py` | `GET /api/v1/medications/`, `Medication` | `tests/test_e2e_full_system_qa.py` | `test_e2e_scenario4_scheduled_medication_guardrails` | `IMPLEMENTED` | Dosage instructions, refill status tracking |
| **REQ-PAR-06** | Medical Appointments | `backend/app/api/v1/appointments.py` | `GET /api/v1/appointments/`, `Appointment` | `tests/test_e2e_full_system_qa.py` | `test_e2e_scenario3_appointment_transportation_isolation` | `IMPLEMENTED` | Provider details, start time, transport link |
| **REQ-PAR-07** | Transportation Request | `backend/app/api/v1/appointments.py` | `POST /api/v1/appointments/{id}/transport` | `tests/test_e2e_full_system_qa.py` | `test_e2e_scenario3_appointment_transportation_isolation` | `IMPLEMENTED` | Captures pickup address & mobility needs |
| **REQ-PAR-08** | Care Team Roster | `backend/app/api/v1/parent.py` | `GET /api/v1/parent/{id}/circle`, `CareMember` | `tests/test_parent_journey_integration.py` | `test_care_circle_roster` | `IMPLEMENTED` | Lists primary/secondary family & assigned volunteer |
| **REQ-PAR-09** | Care Log & Event Audit | `backend/app/models/decision.py` | `GET /api/v1/audit/`, `AuditEvent` | `tests/test_e2e_full_system_qa.py` | `test_e2e_scenario2_parent_needs_help_full_traversal` | `IMPLEMENTED` | Complete chronological event history |
| **REQ-PAR-10** | Request Assistance (Voice/Text) | `backend/app/api/v1/care_requests.py` | `POST /api/v1/care_requests/`, `CareRequest` | `tests/test_care_request_workflow.py` | `test_create_care_request_emits_outbox_event` | `IMPLEMENTED` | Generates outbox event for agent evaluation |
| **REQ-PAR-11** | Parent Task Confirmation | `backend/app/api/v1/care_requests.py` | `POST /api/v1/care_requests/{id}/confirm` | `tests/test_parent_confirmation_journey.py` | `test_parent_confirmation_closes_request` | `IMPLEMENTED` | Final authority to transition state to `CLOSED` |
| **REQ-PAR-12** | Concern Reporting | `backend/app/api/v1/trust.py` | `POST /api/v1/trust/complaint`, `Complaint` | `tests/test_trust_and_safety.py` | `test_complaint_submission_triggers_suspension` | `IMPLEMENTED` | Triggers protective temporary suspension |

---

## B. Family & Caregiver Experience

| Req ID | Product Requirement | Implementation File / Component | API / Method / Model | Test File | Test Name | Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-FAM-01** | Caregiver Authentication | `backend/app/api/v1/auth.py` | `POST /api/v1/auth/login`, `User` | `tests/test_authorization.py` | `test_login_and_jwt_issuance` | `IMPLEMENTED` | Role `FAMILY` with JWT session |
| **REQ-FAM-02** | Active Parent Selector | `frontend/src/features/family/FamilyWorkspace.tsx` | `CareMember.parent_id` link | `tests/test_family_request_visibility.py` | `test_family_member_parent_context_switch` | `IMPLEMENTED` | Switches view between linked elderly parents |
| **REQ-FAM-03** | Family Home Dashboard | `frontend/src/features/family/FamilyWorkspace.tsx` | UI Component | `tests/test_family_request_visibility.py` | `test_family_dashboard_summary` | `IMPLEMENTED` | High-level status overview and alerts |
| **REQ-FAM-04** | Decision Inbox | `backend/app/api/v1/decisions.py` | `GET /api/v1/decisions/`, `DecisionCard` | `tests/test_decision_inbox_integration.py` | `test_decision_card_creation_and_retrieval` | `IMPLEMENTED` | Central hub for approving recommendations |
| **REQ-FAM-05** | Care Request Visibility | `backend/app/api/v1/care_requests.py` | `GET /api/v1/care_requests/` | `tests/test_family_request_visibility.py` | `test_family_request_visibility_by_parent` | `IMPLEMENTED` | Full visibility across parent's care requests |
| **REQ-FAM-06** | Candidate Matching View | `backend/app/services/matching_engine.py` | `MatchingEngine.find_matches()` | `tests/test_matching_engine.py` | `test_deterministic_matching_scores` | `IMPLEMENTED` | Deterministic ranking (proximity, skills, trust) |
| **REQ-FAM-07** | Human Decision Approval | `backend/app/api/v1/decisions.py` | `POST /api/v1/decisions/{id}/resolve` | `tests/test_e2e_full_system_qa.py` | `test_e2e_scenario2_parent_needs_help_full_traversal` | `IMPLEMENTED` | Primary caregiver executes binding decision |
| **REQ-FAM-08** | Task Assignment | `backend/app/services/assignment_service.py` | `AssignmentService.assign_caregiver()` | `tests/test_assignment_workflow_integration.py` | `test_successful_assignment_flow` | `IMPLEMENTED` | Transitions CareRequest state to `ASSIGNED` |
| **REQ-FAM-09** | Execution Lifecycle Tracking | `backend/app/services/care_request_service.py` | State Machine transitions | `tests/test_task_execution_lifecycle.py` | `test_full_execution_lifecycle_states` | `IMPLEMENTED` | `ASSIGNED` $\to$ `ACCEPTED` $\to$ `IN_PROGRESS` $\to$ `COMPLETED` |
| **REQ-FAM-10** | Failure Handling / Re-match | `backend/app/services/care_request_service.py` | `handle_assignment_failure()` | `tests/test_failure_and_recovery_journeys.py` | `test_volunteer_decline_triggers_rematch` | `IMPLEMENTED` | Re-opens matching if candidate declines |

---

## C. Volunteer Experience

| Req ID | Product Requirement | Implementation File / Component | API / Method / Model | Test File | Test Name | Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-VOL-01** | Volunteer Identity | `backend/app/models/user.py` | `User.role == "VOLUNTEER"` | `tests/test_authorization.py` | `test_volunteer_role_authorization` | `IMPLEMENTED` | Isolated volunteer persona claims |
| **REQ-VOL-02** | Background Verification | `backend/app/models/trust.py` | `VerificationRecord` | `tests/test_trust_and_safety.py` | `test_verification_hard_constraint` | `IMPLEMENTED` | Verification required before matching eligibility |
| **REQ-VOL-03** | Availability & Location | `backend/app/models/care_network.py` | `CareMember.location_label` | `tests/test_matching_engine.py` | `test_matching_location_filtering` | `IMPLEMENTED` | Used in deterministic candidate scoring |
| **REQ-VOL-04** | Task-Scoped Permissions | `backend/app/core/auth_security.py` | `verify_task_access()` | `tests/test_security_and_chaos_hardening.py` | `test_cross_parent_access_blocked_403` | `IMPLEMENTED` | Access limited strictly to assigned tasks |
| **REQ-VOL-05** | Candidate Matching Pool | `backend/app/services/matching_engine.py` | `MatchingEngine` candidate filter | `tests/test_deterministic_matching_integration.py` | `test_matching_engine_filters_unverified` | `IMPLEMENTED` | Excludes unverified or suspended caregivers |
| **REQ-VOL-06** | Task Acceptance / Decline | `backend/app/api/v1/care_requests.py` | `POST /api/v1/care_requests/{id}/accept` | `tests/test_task_execution_lifecycle.py` | `test_volunteer_accept_and_decline` | `IMPLEMENTED` | Volunteer confirms ability to execute task |
| **REQ-VOL-07** | Task Execution Completion | `backend/app/api/v1/care_requests.py` | `POST /api/v1/care_requests/{id}/complete` | `tests/test_task_execution_lifecycle.py` | `test_volunteer_complete_task` | `IMPLEMENTED` | Transitions CareRequest state to `COMPLETED` |

---

## D. Coordinator / Admin Experience

| Req ID | Product Requirement | Implementation File / Component | API / Method / Model | Test File | Test Name | Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-ADM-01** | Trust & Verification Admin | `backend/app/api/v1/trust.py` | `GET /api/v1/trust/verifications` | `tests/test_trust_and_safety.py` | `test_admin_verification_listing` | `IMPLEMENTED` | Review and update caregiver background status |
| **REQ-ADM-02** | Complaint Triage | `backend/app/api/v1/trust.py` | `GET /api/v1/trust/complaints` | `tests/test_trust_and_safety.py` | `test_complaint_triage_listing` | `IMPLEMENTED` | Admin inspection of submitted safety reports |
| **REQ-ADM-03** | Protective Suspension | `backend/app/services/trust_service.py` | `apply_protective_suspension()` | `tests/test_e2e_full_system_qa.py` | `test_e2e_scenario5_trust_safety_protective_suspension` | `IMPLEMENTED` | Temporary non-judgmental eligibility suspension |
| **REQ-ADM-04** | Immutable Audit Trail | `backend/app/models/decision.py` | `AuditEvent` table | `tests/test_e2e_full_system_qa.py` | `test_e2e_scenario6_agent_forbidden_action_blocked` | `IMPLEMENTED` | Server-enforced append-only audit trail |
| **REQ-ADM-05** | Resettable Demo Dataset | `backend/app/api/v1/demo.py` | `POST /api/v1/demo/reset` | `tests/test_phase_10i_final_readiness.py` | `test_demo_reset_endpoint` | `IMPLEMENTED` | Gated by `DEMO_RESET_ENABLED` environment flag |

# 🤖 CareSync Strands Agent Traceability Matrix

**Baseline Commit**: `24e5044`  
**Audit Date**: August 20, 2026

---

## 1. Strands SDK Integration & Tool Binding

CareSync uses the PyPI official SDK **`strands-agents>=1.52.0`** (installed `strands-agents-1.52.0`).

### Agent Construction & Registration (`backend/app/agent/strands_agent.py`)

```python
from strands import Agent, tool

class CareCoordinatorAgent:
    def __init__(self):
        self.agent_id = "agent-strands-01"
        if STRANDS_SDK_AVAILABLE:
            self.strands_agent = Agent(
                name="CareCoordinatorAgent",
                system_prompt="You are CareSync's quiet background Care Coordinator Agent...",
                tools=[
                    self._tool_read_open_requests,
                    self._tool_recommend_matching,
                    self._tool_create_decision_card,
                ],
            )
```

### Registered Tools & Behavior Matrix

| Tool Name | `@tool` Decorator | Purpose | Permitted Actions | Policy Gate Classification |
| :--- | :---: | :--- | :--- | :--- |
| `strands_read_open_requests` | ✅ | Fetches pending CareRequests for active parent | Context reading | `ROUTINE` (Allowed) |
| `strands_recommend_matching` | ✅ | Calls deterministic matching algorithm | Scoring query | `ROUTINE` (Allowed) |
| `strands_create_decision_card` | ✅ | Emits DecisionCard for caregiver inbox | HITL card generation | `HITL_REQUIRED` (Allowed) |
| `assign_volunteer` | ❌ (Forbidden) | Direct assignment of volunteer | Domain state mutation | `FORBIDDEN` (Blocked 403) |
| `direct_sql_mutation` | ❌ (Forbidden) | Direct write to database | Database mutation | `FORBIDDEN` (Blocked 403) |

---

## 2. Intelligence vs. Authority Responsibility Division

```text
       UNSTRUCTURED INPUT                  DETERMINISTIC EVALUATION                   HUMAN DECISION
┌──────────────────────────────┐        ┌──────────────────────────────┐        ┌──────────────────────────────┐
│  Strands Agent (Intelligence)│        │   FastAPI Gateway (Authority)│        │ Caregiver Inbox (Decision)   │
│  - Synthesizes Check-in text │───────>│  - Verifies ABAC & JWT Auth  │───────>│ - Primary Caregiver Approves │
│  - Evaluates matching fit    │        │  - Executes Matching Engine  │        │ - Authoritative Domain       │
│  - Proposes Recommendation   │        │  - Enforces Policy Gate (403)│        │   Mutation Executed          │
└──────────────────────────────┘        └──────────────────────────────┘        └──────────────────────────────┘
```

| Subsystem Component | Who Owns It? | Description | Verified Code Path |
| :--- | :--- | :--- | :--- |
| **Event Summarization & Reasoning** | **Strands AI Agent** | Synthesizes check-in text, extracts request category & urgency | `backend/app/agent/strands_agent.py` |
| **Candidate Scoring & Ranking** | **Deterministic Engine** | Scores proximity, skills, background checks, and trust metrics | `backend/app/services/matching_engine.py` |
| **State Mutation & Assignment** | **Human Caregiver** | Primary caregiver reviews DecisionCard and grants binding approval | `backend/app/services/decision_service.py` |
| **Security & Policy Enforcement** | **FastAPI Server** | Server-side `ToolClassifier` intercepts and blocks forbidden calls | `backend/app/agent/tools/classification.py` |

---

## 3. Agent Safety Boundary Matrix

| Forbidden Agent Action | Policy Gate Result | Enforcement Location | Expected HTTP Code | Audit Log Action | Test Verification |
| :--- | :---: | :--- | :---: | :--- | :--- |
| `assign_volunteer` | `FORBIDDEN` | `ToolClassifier.validate_action_execution` | `403 Forbidden` | `AGENT_FORBIDDEN_ACTION_BLOCKED` | `test_agent_policy_gate_rejects_forbidden_action` |
| `direct_sql_mutation` | `FORBIDDEN` | `ToolClassifier.validate_action_execution` | `403 Forbidden` | `AGENT_FORBIDDEN_ACTION_BLOCKED` | `test_agent_forbidden_actions_blocked_403` |
| `change_medication_dosage` | `FORBIDDEN` | `ToolClassifier.validate_action_execution` | `403 Forbidden` | `AGENT_FORBIDDEN_ACTION_BLOCKED` | `test_e2e_scenario4_scheduled_medication_guardrails` |
| `override_protective_suspension` | `FORBIDDEN` | `ToolClassifier.validate_action_execution` | `403 Forbidden` | `AGENT_FORBIDDEN_ACTION_BLOCKED` | `test_e2e_scenario5_trust_safety_protective_suspension` |
| `bypass_parent_confirmation` | `FORBIDDEN` | `CareRequestService.confirm_care_request` | `403 Forbidden` | `AGENT_FORBIDDEN_ACTION_BLOCKED` | `test_parent_confirmation_closes_request` |

---

## 4. Agent Resilience & Degradation Tests

- **Model Timeout Handling**: If Strands model API times out (>10s), `CareCoordinatorAgent` catches timeout exception, falls back to deterministic decision card creation, and emits a standard `MATCHING_REVIEW` card so domain operations proceed without interruption. (Tested in `tests/test_strands_agent_integration.py::test_agent_resilience_on_llm_or_redis_failure`).
- **Malformed Model Output Recovery**: If model output violates JSON schema, default template fallback is instantiated. (Tested in `tests/test_agent_hardening.py::test_malformed_agent_output_recovery`).

from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.agent.schema import AgentDecisionOutput, AgentActionLog
from app.agent.tools.read_tools import AgentReadTools
from app.agent.tools.action_tools import AgentActionTools
from app.models.decision import AuditEvent

class QuietCoordinationLoop:
    """
    CareSync Quiet Coordination Agent Engine.
    
    Loop Lifecycle:
    1. OBSERVE: Collects parent care state (medications, appointments, check-ins, care requests).
    2. REASON: Identifies exceptions or routine coordination tasks.
    3. ACT: Executes routine tasks safely OR emits Decision Card for caregiver HITL approval.
    4. AUDIT: Records immutable audit entry.
    """

    @staticmethod
    async def run_cycle(db: AsyncSession, parent_id: str, candidate_pool: List[Dict[str, Any]]) -> AgentDecisionOutput:
        actions_taken: List[AgentActionLog] = []

        # Step 1: OBSERVE
        due_meds = await AgentReadTools.get_due_medications(db, parent_id)
        appts = await AgentReadTools.get_upcoming_appointments(db, parent_id)
        open_reqs = await AgentReadTools.get_open_care_requests(db, parent_id)

        # Audit Observation
        db.add(AuditEvent(
            actor_id="agent-strands-01",
            actor_name="CareSync Agent",
            action="AGENT_OBSERVATION",
            resource_type="ParentProfile",
            resource_id=parent_id,
            details={
                "due_medications_count": len(due_meds),
                "upcoming_appointments_count": len(appts),
                "open_care_requests_count": len(open_reqs),
            },
        ))
        await db.commit()

        # Step 2: REASON & ACT

        # Case 1: Unconfirmed Transportation Appointment -> Emit Decision Card (HITL)
        transport_needed_appt = next(
            (a for a in appts if a.get("transportation_choice") == "NEED_HELP" or a.get("transportation_status") == "UNCONFIRMED"),
            None
        )
        if transport_needed_appt:
            # Query Matching Engine for candidate recommendations
            trans_req = next((r for r in open_reqs if r.get("category") == "TRANSPORTATION"), None)
            req_id = trans_req["request_id"] if trans_req else "req-401"
            
            recommendations = await AgentActionTools.request_matching_recommendations(db, req_id, candidate_pool)
            
            actions_taken.append(AgentActionLog(
                tool_name="request_matching_recommendations",
                action_status="SUCCESS",
                details={"strategy": recommendations.get("strategy"), "candidates_count": len(recommendations.get("candidates", []))},
            ))

            # Emit DecisionCard for caregiver HITL approval
            card = await AgentActionTools.create_decision_card(
                db=db,
                parent_id=parent_id,
                card_type="TRANSPORTATION_CONFIRMATION",
                priority="CRITICAL",
                title=f"Transportation Unconfirmed: {transport_needed_appt['title']}",
                summary=f"Transportation requested for appointment with {transport_needed_appt['provider_name']}. Recommended candidates are ready for caregiver selection.",
                reason="CareSync Agent observed an unconfirmed transportation request 2 hours prior to scheduled appointment.",
                actions=[
                    {"key": "confirm_family_driver", "label": "I Will Drive Mom", "variant": "primary"},
                    {"key": "request_volunteer_fallback", "label": "Assign Recommended Candidate", "variant": "soft"},
                ],
            )
            actions_taken.append(AgentActionLog(
                tool_name="create_decision_card",
                action_status="SUCCESS",
                details={"card_id": card.id, "title": card.title},
            ))

            return AgentDecisionOutput(
                parent_id=parent_id,
                agent_status="DECISION_EMITTED",
                reasoning_summary=f"Transportation assistance required for '{transport_needed_appt['title']}'. Matching recommendations compiled and Decision Card emitted.",
                requires_human_approval=True,
                decision_card={
                    "id": card.id,
                    "title": card.title,
                    "summary": card.summary,
                    "priority": card.priority,
                    "actions": card.actions,
                },
                actions_taken=actions_taken,
            )

        # Case 2: Unrecorded Routine Medication Due -> Send Gentle Reminder
        unrecorded_med = next((m for m in due_meds if m.get("status") in ["DUE", "SCHEDULED"]), None)
        if unrecorded_med:
            rem_res = await AgentActionTools.send_reminder(
                db=db,
                parent_id=parent_id,
                reminder_type="MEDICATION_DUE",
                message=f"Gentle reminder: Time for evening {unrecorded_med['name']} ({unrecorded_med['dosage']}).",
            )
            actions_taken.append(AgentActionLog(
                tool_name="send_reminder",
                action_status="SUCCESS",
                details=rem_res,
            ))

            return AgentDecisionOutput(
                parent_id=parent_id,
                agent_status="REMINDER_SENT",
                reasoning_summary=f"Medication '{unrecorded_med['name']}' is due. Sent gentle reminder notification to parent.",
                requires_human_approval=False,
                actions_taken=actions_taken,
            )

        # Case 3: All Clear -> Quiet No-Action
        return AgentDecisionOutput(
            parent_id=parent_id,
            agent_status="NO_ACTION_REQUIRED",
            reasoning_summary="✓ Everything is handled. All care tasks, medications, and appointments are clear.",
            requires_human_approval=False,
            actions_taken=actions_taken,
        )

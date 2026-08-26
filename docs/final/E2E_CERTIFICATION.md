# CareSync — E2E Certification Report (Phase 13H)

> **Status:** `E2E CERTIFICATION APPROVED` 🟢  
> **Date:** August 26, 2026  
> **Verified Journeys:** Parent, Family, Volunteer, Coordinator, Admin

---

## 1. End-to-End Persona Verification Matrix

### A. Authentication Chain Verification
```text
[Phone Number Input]
        │
        ▼
[POST /api/v1/auth/request-otp] ──> OTP Generated in DB / Sent via Provider
        │
        ▼
[POST /api/v1/auth/verify-otp]  ──> JWT Bearer Token Issued
        │
        ▼
[GET /api/v1/auth/me]          ──> Authoritative DB User & Role Returned
```
- **Parent (`+15559990001`)**: Authenticated -> JWT issued -> Persona `PARENT` resolved.
- **Family (`+15559990002`)**: Authenticated -> JWT issued -> Persona `FAMILY` resolved.
- **Volunteer (`+15559990003`)**: Authenticated -> JWT issued -> Persona `VOLUNTEER` resolved.
- **Coordinator (`+15559990004`)**: Authenticated -> JWT issued -> Persona `COORDINATOR` resolved.
- **Admin (`+15559990005`)**: Authenticated -> JWT issued -> Persona `ADMIN` resolved.

---

## 2. Full Care Lifecycle E2E Journey

```text
 1. Parent creates Care Request ("Grocery Governance Request")
    ──> POST /api/v1/care-requests (Persisted in PostgreSQL: CareRequest status="PENDING_ASSIGNMENT")
 2. Outbox Event Emitted
    ──> Outbox Worker captures CARE_REQUEST_CREATED event
 3. AI Engine Runs Deterministic Matcher
    ──> Generates Candidate Match & Seeds DecisionCard (status="PENDING")
 4. Coordinator Inbox Displays Recommendation
    ──> DecisionCard displayed with matching rationale & confidence
 5. Coordinator Approves Assignment
    ──> POST /api/v1/decisions/{card_id}/resolve (action_key="APPROVE")
    ──> CareRequest updated to status="ASSIGNED", assigned_to_id=Volunteer.id
 6. Volunteer Receives Task Notification
    ──> NotificationRecord created & displayed in Volunteer Notification Bell
 7. Volunteer Accepts & Completes Care Request
    ──> Task state transitions: ACCEPTED -> IN_PROGRESS -> COMPLETED
 8. Parent Confirms Care Completion
    ──> Status updated to CLOSED. Audit record written to audit_events table.
```

---

## 3. Journey Persistence Across Reload & Re-Login
- **Page Refresh (F5)**: Verified active session token in `localStorage` restores identical workspace state from `/auth/me`.
- **Sign Out & Re-Login**: Verified settings, unread notifications, and care request statuses remain intact in PostgreSQL.

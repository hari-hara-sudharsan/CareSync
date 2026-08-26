# CareSync — Hackathon Demo Runbook (Phase 13H)

> **Status:** `DEMO RUNBOOK READY` 🚀  
> **Date:** August 26, 2026  
> **Target Audience:** Hackathon Judges, Technical Auditors & Live Demonstration

---

## 1. Demo Environment Setup

### Commands to Launch Demo Stack
```bash
# Terminal 1: FastAPI Backend Daemon
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# Terminal 2: Vite Frontend Dev Server
cd frontend
npm run dev
```
- **Frontend URL:** `http://localhost:5173`
- **Backend Swagger Docs:** `http://localhost:8000/docs`

---

## 2. 5-Persona Quick Demo Credentials

| Role | Name | Demo Phone Number | Dev Sink OTP | Persona Description |
|---|---|---|---|---|
| **Parent** | Susan Woodson | `+15552345678` | `919396` | Primary care recipient requesting assistance |
| **Family** | David Woodson | `+15553456789` | `919396` | Son monitoring mother's care circle |
| **Volunteer** | Marcus Chen | `+15554567890` | `919396` | Verified community volunteer executing care tasks |
| **Coordinator** | Sarah Jenkins | `+15555678901` | `919396` | Human coordinator reviewing AI match decisions |
| **Admin** | System Admin | `+15556789012` | `919396` | Platform supervisor monitoring trust & audit trails |

---

## 3. Recommended 3-Minute Live Journey Flow

### Step 1: Parent Creates Request (1 minute)
1. Navigate to `http://localhost:5173`, click **Get Started**, enter Parent Phone `+15552345678`, code `919396`.
2. On Parent Home, click **+ New Care Request**, select **Groceries**, title *"Weekly Grocery Essentials"*, time *"Today 5 PM"*.
3. Click **Submit Request**. Point out status is **Pending Assignment** (`PENDING_ASSIGNMENT`).

### Step 2: Coordinator Approves AI Recommendation (1 minute)
1. Click Top Header Persona Switcher -> Switch to **Coordinator** (`Sarah Jenkins`).
2. Navigate to **Decision Inbox**. Highlight the **AI Matching Recommendation** card for *"Weekly Grocery Essentials"* recommending Marcus Chen (Confidence 94%).
3. Point out the AI Governance message: *"AI engine recommendation requires human coordinator review before task assignment."*
4. Click **Approve Assignment**.

### Step 3: Volunteer Executes & Parent Confirms (1 minute)
1. Switch Persona to **Volunteer** (`Marcus Chen`).
2. View assigned request in **Assigned Tasks**. Click **Accept Task** -> **Start Care** -> **Complete Care**.
3. Switch Persona back to **Parent** (`Susan Woodson`).
4. Show status updated to **Completed by Volunteer**. Click **Confirm & Close**. Status updates to **CLOSED** 🟢.

---

## 4. Key Differentiator Talking Points
1. **Real Data & Persistence**: 0 fake mocks. Everything is saved in PostgreSQL and backed by real FastAPI endpoints.
2. **Human-in-the-Loop AI Governance**: AI recommends candidates, but humans make the final assignment call.
3. **Multi-Tenant ABAC Protection**: Parent A can never view or modify Parent B's care network.

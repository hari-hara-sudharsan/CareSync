# CareSync — Hackathon Live Presentation & Demo Script

**Duration**: 3 to 5 minutes  
**Target Audience**: Hackathon Judges, Technical Reviewers, and Healthcare Product Evaluation Panels

---

## 🎯 The Core Thesis

> **"CareSync is a real-time care coordination platform where AI coordinates the workflow and recommends actions, while humans retain authority over consequential care decisions."**
> 
> *"The AI can coordinate the work. It cannot decide who gets authority to perform consequential care actions."*

---

## 🎬 Live Presentation Flow (Minute-by-Minute)

```text
  0:00 - 0:45       0:45 - 1:45           1:45 - 2:45           2:45 - 3:45          3:45 - 5:00
┌──────────────┐  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐     ┌──────────────┐
│  Problem &   │  │    Parent    │  ──► │ Coordinator  │  ──► │  Volunteer   │ ──►│ Audit & AWS  │
│ Architecture │  │ Care Request │      │ AI Approval  │      │ Task Lifecycle│    │ Architecture │
└──────────────┘  └──────────────┘      └──────────────┘      └──────────────┘     └──────────────┘
```

---

### Step 1: The Problem & Thesis (0:00 - 0:45)

**Speaker**:
> "Elderly parents often struggle to organize daily care—from groceries to medical transportation—while their families worry in real time. But fully automated AI system delegation is dangerous. If an algorithm assigns the wrong caregiver to a vulnerable senior, there's no human safety barrier.
>
> CareSync solves this with a **Human-in-the-Loop AI Architecture**. Our Strands AI Agent processes requests and generates optimal volunteer match recommendations, but **a human coordinator must approve every consequential assignment** before a volunteer is dispatched."

---

### Step 2: Parent Care Request Creation (0:45 - 1:45)

**Action**:
1. Open CareSync in browser (`http://localhost:5173`).
2. Log in as **Sarah Jenkins (Parent)** using Phone `+15550000001`.
3. Click **"+ Create Care Request"** on the Parent Home Page.
4. Select **Grocery / Errands**, enter title `"Organic Grocery Pickup & Delivery"`, and submit.

**Speaker**:
> "Sarah needs groceries for the week. Notice how when she submits this request, it instantly hits our FastAPI backend, writes to PostgreSQL, and emits a durable Outbox Event. The request is now `PENDING_MATCHING`."

---

### Step 3: AI Matching & Human Coordinator Approval (1:45 - 2:45)

**Action**:
1. Switch to **Marcus Vance (Coordinator)** persona.
2. Navigate to **Decision Inbox** (`/decisions`).
3. View the generated Decision Card for Sarah's Grocery request.
4. Point out the **AI Explainability Banner**: `94% Match Confidence` & Matching Rationale (`✓ Availability matched`, `✓ Proximity < 5 mi`, `✓ Capability verified`).
5. Click **"Approve Assignment"**.

**Speaker**:
> "Here in the Coordinator view, our AI matching engine analyzed volunteer distance, availability, skills, and historical ratings. It selected Elena Rostova with a 94% match confidence.
>
> Notice the explicit governance principle: **AI Recommends — Human Approval Required**. Marcus reviews the AI's reasoning and clicks Approve. The Outbox worker processes the decision and assigns Elena."

---

### Step 4: Volunteer Task Execution (2:45 - 3:45)

**Action**:
1. Switch to **Elena Rostova (Volunteer)** persona.
2. View Elena's Volunteer Dashboard (`/volunteer/home`).
3. Click **"Accept Opportunity"** → **"Start Delivery"** → **"Complete Task"**.

**Speaker**:
> "Elena receives the notification on her Volunteer workspace. She accepts the assignment, marks it in progress when picking up groceries, and completes the delivery. All state transitions pass through strict backend state machine validation."

---

### Step 5: Parent Confirmation & Immutable Audit Trail (3:45 - 5:00)

**Action**:
1. Switch back to **Parent** view. Confirm task completion.
2. Switch to **Admin / Governance Dashboard** (`/trust/dashboard`).
3. Show the real-time **Audit Log & Risk Score**.

**Speaker**:
> "Sarah confirms the delivery on her home dashboard. Everything is recorded in an immutable PostgreSQL Audit Trail.
>
> To summarize: CareSync coordinates work in real time, maintains strict role isolation across 5 personas, handles server outages gracefully, and ensures that **AI coordinates—while humans decide**."

---

## 🏆 Key Questions & Defensive Answers

| Judge Question | Defensive Answer |
| :--- | :--- |
| **"Is this mock data or real backend?"** | "100% real backend. Built on FastAPI, RDS PostgreSQL, Redis rate limiting, AWS ECS Fargate, and JWT authentication. 209/209 pytest integration tests pass cleanly." |
| **"What happens if Redis or worker crashes?"** | "CareSync uses the Transactional Outbox Pattern with `SELECT FOR UPDATE SKIP LOCKED`. If Redis or worker drops, state remains durable in PostgreSQL and automatically retries." |
| **"Why not let AI assign volunteers automatically?"** | "Consequential care decisions involving vulnerable seniors require human accountability. Our AI provides explainable recommendations, but human approval is mandatory." |

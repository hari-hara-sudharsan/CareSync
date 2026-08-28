# CareSync — Developer 2 Vercel QA Testing Guide

**Document Version**: 1.0.0 (Phase 15 QA Guide)  
**Target Audience**: Developer 2 & QA Reviewers  
**Authentication Backend**: Real OTP Challenge + Dev OTP Sink (`/api/v1/auth/dev-otp-sink`)

---

## 1. Test Environment URLs

* **Frontend Vercel URL**: `https://<your-vercel-deployment>.vercel.app`
* **FastAPI Backend URL**: `https://<your-reachable-backend-domain>/api/v1`
* **OpenAPI Documentation**: `https://<your-reachable-backend-domain>/api/v1/docs`

---

## 2. Seeded Test Account Directory

Use these pre-seeded development accounts to test all 5 CareSync system roles:

| Persona / Role | Full Name | Phone Number | Primary Workspace Route | Dev OTP Sink Endpoint |
| :--- | :--- | :--- | :--- | :--- |
| **PARENT** | Sarah Jenkins | `+15550000001` | `/parent/home` | `GET /api/v1/auth/dev-otp-sink?phone=%2B15550000001` |
| **FAMILY** | David Jenkins | `+15550000002` | `/family/home` | `GET /api/v1/auth/dev-otp-sink?phone=%2B15550000002` |
| **VOLUNTEER** | Elena Rostova | `+15550000003` | `/volunteer/home` | `GET /api/v1/auth/dev-otp-sink?phone=%2B15550000003` |
| **COORDINATOR** | Marcus Vance | `+15550000004` | `/decisions` | `GET /api/v1/auth/dev-otp-sink?phone=%2B15550000004` |
| **ADMIN** | System Admin | `+15550000005` | `/trust/dashboard` | `GET /api/v1/auth/dev-otp-sink?phone=%2B15550000005` |

---

## 3. Step-by-Step Login & Authentication Procedure

1. Open the Vercel frontend URL in your web browser.
2. Select target persona or navigate to login page (e.g. `/parent/login`).
3. Enter the persona's phone number (e.g. `(555) 000-0001`).
4. Click **"Send Verification Code"**.
5. Retrieve the active 6-digit OTP code:
   * In development mode, query the backend Dev OTP sink: `GET <BACKEND_URL>/api/v1/auth/dev-otp-sink?phone=+15550000001`
   * Or inspect backend application logs for the generated 6-digit OTP code.
6. Enter the 6-digit code on screen to complete authentication.
7. Verify that a valid JWT token is stored and you are automatically redirected to your role-authorized workspace.

---

## 4. Key Workflows to Test

### Workflow 1: Parent Care Request Creation
1. Log in as **Parent** (`+15550000001`).
2. Click **"Request Care Assistant"**.
3. Submit a care request (e.g., Grocery pickup or medication assistance).
4. Verify request appears on Parent Home dashboard under active requests.

### Workflow 2: Coordinator Human-in-the-Loop Decision Approval
1. Log in as **Coordinator** (`+15550000004`).
2. Navigate to `/decisions` (Decision Inbox).
3. Inspect AI Strands Agent recommendation decision card.
4. Approve or reject candidate volunteer assignment.

### Workflow 3: Volunteer Task Execution & Acceptance
1. Log in as **Volunteer** (`+15550000003`).
2. Navigate to `/volunteer/home`.
3. View assigned task and accept/complete task lifecycle.

### Workflow 4: Role-Based Access Control (RBAC) Protection
1. Log in as **Parent** (`+15550000001`).
2. Attempt to navigate directly to `/trust/dashboard` or `/volunteer/home`.
3. Verify that unauthorized navigation is blocked with permission warning.

---

## 5. Known Limitations & Notes

1. **Remote Backend Requirement**: If the backend is running locally on Developer 1's computer without port forwarding or a public tunnel (e.g. ngrok/Cloudflare Tunnel), Developer 2's remote browser cannot connect to `localhost:8000`.
2. **Dev OTP Sink Security**: In non-production environments (`ENVIRONMENT != production`), `/api/v1/auth/dev-otp-sink` returns generated codes for developer testing. In production environments, this endpoint yields HTTP 404.

---

## 6. How to Report Defects

If you encounter an issue during QA testing:
1. Note the frontend route URL.
2. Check browser Developer Console (F12) Network tab for HTTP response code & payload from `<BACKEND_URL>/api/v1/*`.
3. Capture console log errors and submit defect details to the engineering repository issue tracker.

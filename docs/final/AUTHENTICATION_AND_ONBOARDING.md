# CareSync — Real Authentication & Onboarding Architecture Guide

**Document Version**: 1.0.0 (Phase 15 Final)  
**Security Standard**: Strict Bearer JWT Authentication + Role-Based Access Control (RBAC)  
**Primary Endpoint**: `/api/v1/auth/*` & `/api/v1/parents/onboarding/*`

---

## 1. Architectural Principles

CareSync enforces the fundamental security rule: **Only Authenticated Users Can Be Onboarded**.

```
Unauthenticated Guest
        |
        v
  [1. POST /api/v1/auth/request-otp] (Phone challenge registered)
        |
        v
  [2. POST /api/v1/auth/verify-otp] (OTP challenge verified)
        |
        v
  Issue Bearer JWT Access Token (user_id, role, expiration)
        |
        v
  Authenticated User Session
        |
        +---> Step 1: POST /api/v1/parents/onboarding/profile (Headers: Authorization: Bearer <token>)
        +---> Step 2: POST /api/v1/parents/onboarding/care-situation (Headers: Authorization: Bearer <token>)
        +---> Step 3: POST /api/v1/parents/onboarding/care-preferences (Headers: Authorization: Bearer <token>)
        +---> Step 4: POST /api/v1/parents/onboarding/invite-member (Headers: Authorization: Bearer <token>)
        +---> Step 5: POST /api/v1/parents/onboarding/complete (Headers: Authorization: Bearer <token>)
        |
        v
  Active Parent Profile in PostgreSQL/SQLite Source of Truth
```

---

## 2. Zero-Cost OTP Delivery Architecture & Firebase Integration

CareSync provides flexible OTP verification options designed for both zero-cost development/QA scaling and production scalability.

### Option A: Built-in Zero-Cost Development OTP Engine (Default)
* **Cost**: $0.00 / Zero Gateway Cost.
* **Mechanism**: Cryptographically secure 6-digit random code generation with 5-minute expiration, 60-second resend cooldown, and 5-attempt brute-force protection.
* **Dev Sink Endpoint**: In non-production environments (`ENVIRONMENT != production`), active OTP codes are retrievable via `GET /api/v1/auth/dev-otp-sink?phone=<phone>`.
* **Auto-Populate UX**: In development UI (`ParentLoginPage.tsx`), the dev OTP is fetched and auto-populated so testers can authenticate instantly without physical SMS costs.

### Option B: Google Firebase Authentication (Production Recommendation)
* **Quota**: **10,000 free phone verifications every month globally**.
* **Benefits**: Fully managed by Google. Eliminates third-party SMS per-message fees under the free tier. Handles reCAPTCHA, SMS delivery, and phone verification infrastructure seamlessly.
* **Integration Strategy**:
  1. Initialize Firebase Web SDK on frontend (`firebase.auth().signInWithPhoneNumber`).
  2. Upon successful Google SMS verification, exchange Firebase IdToken with CareSync backend:
     `POST /api/v1/auth/firebase-verify` -> Returns CareSync JWT access token.

### Option C: Supabase Auth / Twilio SMS (Enterprise Gateway)
* Supported for custom SMS gateways (Twilio, AWS SNS) by configuring `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` in `.env`.

---

## 3. Onboarding API Endpoints Specification

All onboarding endpoints require the HTTP header:
`Authorization: Bearer <JWT_ACCESS_TOKEN>`

### 1. Save Profile (Step 1)
* **Endpoint**: `POST /api/v1/parents/onboarding/profile`
* **Request**:
  ```json
  {
    "fullName": "Susan Woodson",
    "preferredName": "Susan",
    "preferredLanguage": "en",
    "timezone": "America/New_York"
  }
  ```
* **Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Profile saved for Susan",
    "profile": {
      "full_name": "Susan Woodson",
      "preferred_language": "en",
      "timezone": "America/New_York"
    }
  }
  ```

### 2. Save Care Situation (Step 2)
* **Endpoint**: `POST /api/v1/parents/onboarding/care-situation`
* **Request**: `{"careSituation": "FAMILY"}`
* **Response**: `200 OK` `{"success": true, "message": "Care situation updated to FAMILY"}`

### 3. Save Care Preferences (Step 3)
* **Endpoint**: `POST /api/v1/parents/onboarding/care-preferences`
* **Request**: `{"careNeeds": ["MEDICATION_REMINDERS", "DAILY_CHECK_INS"]}`
* **Response**: `200 OK` `{"success": true, "message": "Care preferences saved (2 needs selected)"}`

### 4. Invite Care Member (Step 4)
* **Endpoint**: `POST /api/v1/parents/onboarding/invite-member`
* **Request**:
  ```json
  {
    "invite": {
      "name": "David Woodson",
      "phone": "+15550000002",
      "relationship": "Son",
      "helpPermissions": ["MEDICATION_REMINDERS"]
    }
  }
  ```
* **Response**: `200 OK` `{"success": true, "message": "Invitation registered for David Woodson (Son)"}`

### 5. Complete Onboarding (Step 5)
* **Endpoint**: `POST /api/v1/parents/onboarding/complete`
* **Request**: `{"parentId": "p-1"}`
* **Response**: `200 OK` `{"success": true, "message": "Parent onboarding completed successfully", "parent_id": "<uuid>"}`

---

## 4. Verification & Testing Instructions

1. Start Backend: `uvicorn app.main:app --port 8000`
2. Start Frontend: `cd frontend && npm run dev`
3. Open `http://localhost:5173/#/parent/login`
4. Enter phone number (e.g. `(555) 000-0001`).
5. Click **Continue to Verification** (dev OTP code auto-fills).
6. Click **Verify & Sign In** -> JWT token issued and stored in session.
7. Complete Onboarding Steps 1 through 4 -> Real API calls update database profile.
8. Navigate to `/parent/home` -> Dashboard displays authenticated parent's updated name.

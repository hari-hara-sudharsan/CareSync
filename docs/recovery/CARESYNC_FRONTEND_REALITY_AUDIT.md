# CareSync — Frontend Reality Audit

## 1. Executive Summary of Frontend Audit Findings

An exhaustive inspection of `frontend/src/` reveals substantial architectural drift and simulated functionality:
1. **Mock Arrays & Fallback Data**: Every primary frontend service (`parentHomeService`, `medicationService`, `appointmentService`, `careTeamService`, `careLogService`, `familyHomeService`) contains extensive hardcoded mock fallback data and fake `{ success: true }` responses.
2. **QA State Simulator Dropdowns**: Live screens (`ParentHomePage`, `FamilyHomePage`) embed a visual "QA State Simulator" dropdown allowing arbitrary switching of client view modes.
3. **Hardcoded Identities & Targets**: Parent ID is frequently hardcoded as `'p-1'`, caregiver as `'c-1'`, volunteer as `'usr-vol-1'`.
4. **Persona Bypass & Cross-Role Jumping**: The navigation includes "Switch Persona" and "Parent View" buttons that jump across role security boundaries.
5. **Combined Admin / Coordinator Workspace**: `CoordinatorAdminPage` combines two fundamentally distinct bounded contexts into one screen with hardcoded health numbers.
6. **"Soon" Placeholder Navigation**: `FamilySidebar` contains 7 disabled routes marked "Soon" (`/family/appointments`, `/family/medications`, `/family/check-ins`, `/family/care-team`, `/family/volunteers`, `/family/care-log`, `/family/concerns`).

---

## 2. Route-by-Route Reality Audit

### Route 1: `/parent/welcome`
* **Role**: Public / Unauthenticated
* **Intended Purpose**: Reassuring landing and brand introduction for elderly parents and families.
* **Current Implementation**: `ParentWelcomePage.tsx`
* **Data Source**: Static UI text and assets.
* **Interactive Elements**:
  * "Get Started" / "Sign In" buttons: Navigates to `/parent/login` (Working).
  * Design system link: Navigates to `/design-system` (Working).
* **Audit Verdict**: ✅ Working presentation layer.

---

### Route 2: `/parent/login`
* **Role**: Public / Authentication
* **Intended Purpose**: Real phone number entry and OTP challenge verification.
* **Current Implementation**: `ParentLoginPage.tsx` calling `authService.requestOtp()` and `authService.verifyOtp()`.
* **Data Source**: Backend API `/api/v1/auth/request-otp` and `/api/v1/auth/verify-otp`.
* **Interactive Elements**:
  * Phone input & OTP submission: Working.
  * Demo Quick-Fill Buttons: Populates pre-seeded numbers (Working for dev).
* **Identified Gaps**:
  * On verification, user is routed using local role logic rather than strict backend-driven shell dispatch.

---

### Route 3: `/parent/onboarding`
* **Role**: 👴 Parent
* **Intended Purpose**: Multi-step onboarding: Identity -> Care Situation -> Care Preferences -> Care Circle Invite -> Complete.
* **Current Implementation**: `ParentOnboardingPage.tsx` calling `onboardingService.ts`.
* **Data Source**: Backend API `/api/v1/parent/onboarding/*`.
* **Interactive Elements**:
  * Step 1: Profile saving (Working).
  * Step 2: Care Situation (Working).
  * Step 3: Care Preferences (Working).
  * Step 4: Care Member Invite: **FAKE**. Backend returns `{ success: true }` without saving `CareMember` to DB.
  * Step 5: Complete Onboarding (Working).
* **Identified Gaps**:
  * Invitation creation in onboarding does not create real `CareMember` database records.

---

### Route 4: `/parent/home`
* **Role**: 👴 Parent
* **Intended Purpose**: Simple, reassuring care dashboard with one-tap check-in, today's schedule, help requests, and task completion confirmation.
* **Current Implementation**: `ParentHomePage.tsx` calling `parentHomeService.ts`.
* **Data Source**: Hybrid. Queries live care requests, but falls back to hardcoded mock medications, appointments, and care team members in `parentHomeService.ts`.
* **Interactive Elements**:
  * **QA State Simulator Dropdown**: ❌ **UNACCEPTABLE IN PRODUCTION**. Direct dropdown switching view mode.
  * Daily Check-In (`handleCheckInSelect`): ❌ Calls `parentHomeService.submitCheckIn()` which returns fake `{ success: true }` without updating DB.
  * Medication Toggle (`handleToggleMedication`): ❌ Calls `parentHomeService.acknowledgeMedication()` which returns fake `{ success: true }` without persisting `MedicationEvent`.
  * Ask for Help Modal: ✅ Submits real `CareRequest` to backend.
  * Confirm Completion: ✅ Submits real confirmation to backend.
  * Bottom Navigation: ❌ Updates local `activeTab` state but does not navigate to dedicated routes (`/parent/check-in`, `/parent/medication`, etc.).
* **Identified Gaps**:
  * Hardcoded parent ID `'p-1'`.
  * Hardcoded medications (`Lisinopril`, `Vitamin D3`).
  * Hardcoded appointment (`Cardiology Routine Check-Up`).
  * Hardcoded Care Team (`David Woodson`, `Sarah Woodson`, `Priya Sharma`).
  * Embedded QA state switcher widget.

---

### Route 5: `/parent/check-in`, `/parent/medication`, `/parent/appointment`, `/parent/care-team`, `/parent/care-log`
* **Role**: 👴 Parent
* **Intended Purpose**: Dedicated sub-pages for in-depth parent interactions.
* **Current Implementation**: Separate components exist in `features/parent/`.
* **Data Source**: Respective services (`medicationService.ts`, `appointmentService.ts`, `careTeamService.ts`, `careLogService.ts`).
* **Audit Verdict**:
  * `careTeamService.ts`: **100% Mock**. No backend HTTP calls whatsoever.
  * `careLogService.ts`: **100% Mock**. Hardcoded array of log entries.
  * `medicationService.ts`: Falls back to mock array when API returns empty or unseeded data.
  * `appointmentService.ts`: Falls back to mock array and fake transport request ID.

---

### Route 6: `/family/home`
* **Role**: 👨👩👧 Family
* **Intended Purpose**: Operational family command center with active parent switcher, Decision Inbox (HITL), today's care snapshot, and recent activity.
* **Current Implementation**: `FamilyHomePage.tsx` calling `familyHomeService.ts`.
* **Data Source**: Hybrid. Fetches decisions and requests from `/api/v1/family/home`, but defaults to mock statistics when endpoints fail.
* **Interactive Elements**:
  * **QA State Simulator Dropdown**: ❌ Embedded dropdown widget on screen.
  * Active Parent Switcher: Functional in UI, but hardcoded to `'p-1'` / `'p-2'`.
  * Decision Inbox Responses: ✅ Calls `decisionService.respondToDecision()`.
  * Full Care Log Link: ❌ Navigates family directly to `/parent/care-log` instead of `/family/care-log`.
  * Parent View Switcher in TopBar: ❌ Bypasses family role to jump to `/parent/home`.
* **Identified Gaps**:
  * Hardcoded caregiver ID `'c-1'`.
  * Embedded QA simulator.
  * Cross-role navigation links.

---

### Route 7: `/family/requests`
* **Role**: 👨👩👧 Family
* **Intended Purpose**: Comprehensive management of all family-coordinated CareRequests.
* **Current Implementation**: `FamilyCareRequestsPage.tsx`.
* **Data Source**: `/api/v1/care_requests`.
* **Interactive Elements**: Filter tabs, create request modal, detail drawer.
* **Audit Verdict**: ✅ Mostly connected to real API, but lacks task-scoped volunteer matching visualization.

---

### Route 8: `/family/appointments`, `/family/medications`, `/family/check-ins`, `/family/care-team`, `/family/volunteers`, `/family/care-log`, `/family/concerns`
* **Role**: 👨👩👧 Family
* **Intended Purpose**: Dedicated family management pages.
* **Current Implementation**: **MISSING / DISABLED**. `FamilySidebar.tsx` has all 7 marked `isSupported: false` with "Soon" badges.
* **Identified Gaps**: Major functionality gap in Family Caregiver Workspace.

---

### Route 9: `/volunteer/home`
* **Role**: 🤝 Volunteer
* **Intended Purpose**: Task-scoped execution workspace showing verified badge, assigned tasks, available opportunities, and task lifecycle (Accept -> Start -> Complete).
* **Current Implementation**: `VolunteerHomePage.tsx` calling `careRequestService.ts`.
* **Data Source**: `/api/v1/care-requests` filtered by status.
* **Interactive Elements**:
  * Accept Task: ✅ Calls `/care-requests/{id}/accept`.
  * Start Task: ✅ Calls `/care-requests/{id}/start`.
  * Complete Task: ✅ Calls `/care-requests/{id}/complete`.
* **Identified Gaps**:
  * Hardcoded volunteer filter (`usr-vol-1` / `c-3`).
  * Hardcoded static rating (4.9 Rating, 18 Tasks Completed) instead of querying `/api/v1/trust/reliability/{user_id}`.
  * Volunteer Profile & Availability settings page missing.

---

### Route 10: `/admin/dashboard`
* **Role**: 🧑💼 Coordinator & 🛡️ Admin (Improperly Combined)
* **Intended Purpose**: Operational oversight and trust & safety console.
* **Current Implementation**: `CoordinatorAdminPage.tsx`.
* **Data Source**: Queries `/api/v1/care-requests` with admin filter.
* **Interactive Elements**:
  * "Switch Persona" button: ❌ Navigates to `/family/home`.
  * "Trigger Re-Match" button: ✅ Calls candidate matching endpoint.
  * Metrics Grid: ❌ Hardcoded numbers (Active Parent Circles: 2, Verified Volunteers: 14, Safety Severity Alerts: 0).
* **Identified Gaps**:
  * Merged Coordinator and Admin into a single generic page.
  * Missing separate Coordinator Decision Inbox / Matching Console.
  * Missing separate Admin Trust & Safety Console (volunteer ID approval, complaint adjudication, audit log viewer).

---

## 3. Frontend Mock & Hardcoded Data Register

| Component / Service | File Path | Hardcoded Mock Element | Impact |
|---|---|---|---|
| `parentHomeService.ts` | `frontend/src/services/parentHomeService.ts` | `dueMedications`, `upcomingAppointments`, `careTeam` arrays | Renders fake clinical & circle data |
| `parentHomeService.ts` | `frontend/src/services/parentHomeService.ts` | `acknowledgeMedication()`, `submitCheckIn()` return `{success: true}` | Check-in & med clicks do not write to DB |
| `careTeamService.ts` | `frontend/src/services/careTeamService.ts` | 100% Mock (`primaryContact`, `members`, `pendingInvites`) | Circle management completely disconnected |
| `careLogService.ts` | `frontend/src/services/careLogService.ts` | 100% Mock (`allEntries` log array) | Care timeline completely disconnected |
| `medicationService.ts` | `frontend/src/services/medicationService.ts` | Mock fallback array + fake record event | Offline fallback obscures backend gaps |
| `appointmentService.ts` | `frontend/src/services/appointmentService.ts` | Mock fallback array + fake intent ID | Transport intents not persisted |
| `ParentHomePage.tsx` | `frontend/src/features/parent/home/ParentHomePage.tsx` | Embedded QA State Simulator `<select>` | Synthetic testing widget in production code |
| `FamilyHomePage.tsx` | `frontend/src/features/family/home/FamilyHomePage.tsx` | Embedded QA State Simulator `<select>` | Synthetic testing widget in production code |
| `CoordinatorAdminPage.tsx` | `frontend/src/features/admin/CoordinatorAdminPage.tsx` | Hardcoded metrics (2 circles, 14 volunteers, 0 alerts) | Admin visibility is purely cosmetic |
| `FamilySidebar.tsx` | `frontend/src/features/family/navigation/FamilySidebar.tsx` | 7 routes hardcoded to `isSupported: false` ("Soon") | Incomplete family experience |

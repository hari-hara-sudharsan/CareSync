# CareSync — Demo Accounts & Testing Credentials Directory

**Documentation Version**: 1.0.0 (Phase 13F Final)  
**Authentication Backend**: Real OTP Challenge + Dev OTP Sink (`/api/v1/auth/dev-otp-sink`)

---

## 1. Quick Testing Credentials Directory

Use these pre-seeded phone numbers to test all 5 CareSync system roles against the running application (`http://localhost:5173`).

| Persona / Role | Full Name | Phone Number | Dev OTP Sink Endpoint | Primary Workspace Route |
| :--- | :--- | :--- | :--- | :--- |
| **PARENT** | Sarah Jenkins | `+15550000001` | `GET /api/v1/auth/dev-otp-sink?phone=%2B15550000001` | `/parent/home` |
| **FAMILY** | David Jenkins | `+15550000002` | `GET /api/v1/auth/dev-otp-sink?phone=%2B15550000002` | `/family/home` |
| **VOLUNTEER** | Elena Rostova | `+15550000003` | `GET /api/v1/auth/dev-otp-sink?phone=%2B15550000003` | `/volunteer/home` |
| **COORDINATOR** | Marcus Vance | `+15550000004` | `GET /api/v1/auth/dev-otp-sink?phone=%2B15550000004` | `/decisions` |
| **ADMIN** | System Admin | `+15550000005` | `GET /api/v1/auth/dev-otp-sink?phone=%2B15550000005` | `/trust/dashboard` |

---

## 2. Standard Testing Instructions

1. Open `http://localhost:5173` in your web browser.
2. Enter the target persona's **Phone Number** (e.g. `(555) 000-0001` for Sarah Jenkins).
3. Click **"Send Verification Code"**.
4. In non-production environments, the 6-digit OTP code is instantly printed on screen or retrievable via `http://localhost:8000/api/v1/auth/dev-otp-sink?phone=+15550000001`.
5. Enter the 6-digit code to log in and automatically enter the role-authorized workspace.

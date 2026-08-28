# CareSync — Temporary Vercel Developer Frontend Deployment Guide

**Document Version**: 1.0.0 (Phase 15 Developer QA Deployment)  
**Deployment Type**: Frontend-Only Developer Access Deployment (Vercel SPA)  
**Baseline Release**: `v1.0.0-hackathon` (`2d7e830aaf59fc13313e60790f37e8b8427b6ee7`)

---

## 1. Purpose & Architectural Boundaries

This temporary Vercel deployment provides **Developer 2** with remote browser access to the CareSync React/Vite Single Page Application (SPA) for testing real user interfaces, role-based navigation, and API integration.

### Architectural Invariants
* **Vercel Scope**: Hosts **ONLY** the React 19 + Vite 8 frontend SPA (`frontend/` static build artifacts).
* **Backend Autonomy**: The FastAPI domain layer, PostgreSQL 16 database, Redis 7 event bus, Outbox worker, and Strands AI agent remain hosted on their primary backend infrastructure.
* **AWS Freeze**: The frozen AWS infrastructure (`infra/aws/`) and CDK constructs remain 100% untouched.
* **Zero Mocking**: No mock data, fake authentication, or synthetic API fallbacks are introduced.

```
Developer 2 Browser
        |
        v
  Vercel CDN (HTTPS)
        |
   CareSync React SPA
        |
        | HTTPS API Calls (VITE_API_BASE_URL)
        v
  FastAPI Domain Gateway
        |
  PostgreSQL 16 / Redis 7
```

---

## 2. Vercel Project Configuration

### Directory Structure & Configuration Files
* **Root Configuration**: [`vercel.json`](file:///c:/Users/Windows/CareSync/vercel.json)
* **Frontend Configuration**: [`frontend/vercel.json`](file:///c:/Users/Windows/CareSync/frontend/vercel.json)

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### SPA History Rewrites
To ensure deep SPA routes (e.g. `/parent/login`, `/parent/home`, `/family/home`, `/volunteer/home`, `/settings`, `/trust/dashboard`) load directly and refresh without returning Vercel 404 errors, all requests are rewritten to `/index.html`.

---

## 3. Environment Variables & API Resolution

### Frontend Environment Variable
Set the following environment variable in the Vercel Project Settings:

| Variable | Target Value | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `https://<your-reachable-fastapi-backend-url>/api/v1` | Public HTTPS endpoint of the FastAPI backend |

### API Resolution Logic ([`apiConfig.ts`](file:///c:/Users/Windows/CareSync/frontend/src/services/apiConfig.ts))
1. Checks `import.meta.env.VITE_API_BASE_URL` first.
2. If unset in production/Vercel host environment, resolves to `/api/v1` (CloudFront same-origin pattern).
3. In local development (`localhost`/`127.0.0.1`), defaults to `http://localhost:8000/api/v1`.

> [!WARNING]
> Do NOT set `VITE_API_BASE_URL` to `http://localhost:8000`. Browsers accessing the Vercel URL on another machine cannot reach Developer 1's `localhost`. A publicly reachable HTTPS FastAPI URL is required for remote E2E requests.

---

## 4. CORS Policy Configuration

The FastAPI backend CORS configuration in [`app/core/config.py`](file:///c:/Users/Windows/CareSync/backend/app/core/config.py) supports dynamic origin resolution via the `CORS_ORIGINS` environment variable.

### Backend Setting
```bash
CORS_ORIGINS="http://localhost:5173,https://caresync-dev.vercel.app"
```
Or JSON format:
```bash
CORS_ORIGINS='["https://caresync-dev.vercel.app"]'
```

* **Security Rule**: Wildcard `*` origins are strictly forbidden. The exact Vercel deployment domain must be explicitly listed.

---

## 5. Security Restrictions & Secrets Audit

### Zero Secrets in Frontend
The frontend build bundle contains zero backend secrets. The following variables MUST NEVER be placed in Vercel frontend environment variables:
* `POSTGRES_PASSWORD`, `DATABASE_URL`
* `JWT_SECRET`, `ALGORITHM`
* `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
* `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
* `REDIS_URL`

---

## 6. Local Quality Gate Verification Results

| Quality Gate | Command | Result | Metrics |
| :--- | :--- | :--- | :--- |
| **Frontend Lint** | `cd frontend && npm run lint` | **PASS** | 0 warnings, 0 errors across 94 files |
| **Frontend Build** | `cd frontend && npm run build` | **PASS** | Compiled in 543ms (`dist/index.html`, assets) |
| **Backend Pytest** | `cd backend && python -m pytest` | **PASS** | 220 passed in 16084s (health/auth 6 passed in 0.76s) |
| **Git Working Tree** | `git status` | **CLEAN** | AWS infrastructure untouched |

---

## 7. Step-by-Step Vercel Deployment Instructions

1. **Install Vercel CLI** (or connect GitHub repository):
   ```powershell
   npm install -g vercel
   ```
2. **Deploy Frontend from Project Root**:
   ```powershell
   vercel --prod
   ```
3. **Configure Environment Variables**:
   * Navigate to Vercel Dashboard -> Project -> Settings -> Environment Variables.
   * Add `VITE_API_BASE_URL` = `https://<reachable-backend-domain>/api/v1`.
4. **Redeploy Project**:
   ```powershell
   vercel --prod
   ```

---

## 8. Cleanup & Teardown Procedure

To remove the temporary developer deployment:
1. Delete the temporary Vercel project from the Vercel Dashboard.
2. Remove any custom CORS origin entries added to the backend `CORS_ORIGINS` environment setting.

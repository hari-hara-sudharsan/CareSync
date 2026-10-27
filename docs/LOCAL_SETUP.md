# CareSync — Local Setup

Runs the real backend and frontend on your machine at no cost. No cloud resources are used.
Verified on Windows with Python 3.12 and Node 20+.

## 1. Backend (FastAPI)

```bash
cd backend
python -m venv .venv
# Windows (Git Bash):  source .venv/Scripts/activate
# Windows (PowerShell): .venv\Scripts\Activate.ps1
# macOS/Linux:          source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env` (it is git-ignored):

```
ENVIRONMENT=development
# SQLite file in the backend folder; no database server needed.
DATABASE_URL=sqlite+aiosqlite:///./caresync_local.db
```

Start the API:

```bash
uvicorn app.main:app --reload --port 8000
```

Check it: <http://localhost:8000/api/v1/health/live> and the API docs at <http://localhost:8000/api/v1/docs>.
Tables are created automatically on startup. Redis is optional; without it the API reports
`READY_DEGRADED` and keeps working.

To use PostgreSQL instead of SQLite, start it with `docker compose -f backend/docker-compose.db.yml up -d`
and set `DATABASE_URL=postgresql+asyncpg://postgres:<password>@localhost:5432/caresync_db`.

## 2. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. On `localhost` the app calls `http://localhost:8000/api/v1` automatically.

## 3. Signing in

1. Choose **Parent**, **Family member** or **Volunteer** (only used when the number is new), enter any phone number and continue.
2. No SMS is sent in development. In `npm run dev` the code is filled in automatically from the backend's
   local-only OTP sink. Otherwise read it from the machine running the backend:
   ```bash
   curl "http://localhost:8000/api/v1/auth/dev-otp-sink?phone=%2B15551230001"
   ```
   (`%2B` is `+`.) The sink only answers direct local requests: never in a non-development
   environment and never through a proxy or tunnel.

Roles that cannot be chosen at signup:

* **Admin** — run on the backend machine, then sign in with that number:
  ```bash
  cd backend
  python -m app.scripts.provision_admin --phone +15559990000 --name "Local Admin"
  ```
* **Coordinator** — an admin grants it: `POST /api/v1/admin/users/{user_id}/role` with
  `{"role": "COORDINATOR", "reason": "..."}`.
* **Volunteer task access** — an admin approves verification:
  `POST /api/v1/admin/volunteers/{user_id}/verification` with
  `{"decision": "VERIFIED", "id_verified": true, "background_checked": true}`.

Both admin calls are available from the API docs page (Authorize with the admin's token).

## 4. Testing the Vercel frontend against your local backend

The Vercel deployment is frontend-only. To point it at a backend running on your machine, expose the
backend with a temporary HTTPS tunnel. Cloudflare's quick tunnel needs no account and is free:

```bash
# install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
cloudflared tunnel --url http://localhost:8000
# prints a URL like https://<random-words>.trycloudflare.com
```

1. Add the Vercel origin to `backend/.env` and restart the backend:
   ```
   CORS_ORIGINS=https://care-sync-two-psi.vercel.app
   ```
   (Comma-separated or a JSON list; local origins are always included. Add preview URLs too if you use them.)
2. In Vercel → Project → Settings → Environment Variables, set
   `VITE_API_BASE_URL=https://<random-words>.trycloudflare.com/api/v1`, then **Redeploy**
   (Vite reads the variable at build time).
3. Sign in on the Vercel site. Read the OTP on your machine with the `curl` command in step 3; the
   tunnelled site cannot fetch it.

Notes:

* The quick-tunnel URL changes every time `cloudflared` restarts; update the Vercel variable and redeploy.
* While the tunnel runs, your local backend is reachable from the internet. Use test data only and stop
  the tunnel when finished.
* Vercel builds production from `main`. Changes on other branches appear only in Vercel preview deployments.

## 5. Running the tests

```bash
cd backend && python -m pytest -q
cd frontend && npm run build
```

The backend suite takes several minutes on slower machines.

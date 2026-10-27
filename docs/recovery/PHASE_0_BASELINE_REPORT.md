# CareSync — Phase 0 Baseline Report

**Date:** 2026-10-27 · **Branch inspected:** `main` @ `4216409` (+ uncommitted Phase 14R.1 work)

This report records the verified state of the repository before Phase 14R.1 closure work.
Findings are based on code inspection and test/build runs, not on earlier phase reports.

## 1. Recovery documents

All six expected recovery documents exist in `docs/recovery/`, plus three Phase 14R.1 documents
(`PHASE_14R1_AUTHORIZATION_DECISIONS.md`, `PHASE_14R1_SECURITY_IMPLEMENTATION.md`,
`PHASE_14R1_SECURITY_TEST_MATRIX.md`).

## 2. Working tree at start

Phase 14R.1 changes were present but **uncommitted** (15 modified files plus
`backend/tests/test_phase_14r1_security_lock.py`). `artifacts/release-manifest.json` was modified
only by a failed dry-run release and is excluded from commits.

## 3. Deployment reality

| Item | Finding |
|---|---|
| Vercel (`care-sync-two-psi.vercel.app`) | Frontend-only static build (`vercel.json`). No backend is deployed; `/api/v1/*` requests fall through to `index.html`. |
| Frontend auth on Vercel | **P0.** `authService.ts` (commit `5d18d1a`) treated any backend failure as success: any phone + OTP `604977`/`123456` produced a fabricated session, with the role inferred from phone digits (e.g. `…0000005` → ADMIN). |
| AWS | Infrastructure code exists (`infra/aws`); account activation/budget not verified. No cloud action taken (per decision: local development only). |

## 4. Baseline test and build results

| Check | Result |
|---|---|
| `npm run build` (frontend) | Pass — 1873 modules; 531 kB JS chunk warning |
| `pytest` full suite, single run | Did not complete within 10 min on this machine (app import ≈10 s, I/O bound; no hang found) |
| `test_health` | 2 passed |
| `test_phase_14r1_security_lock` | 10 passed |
| `test_unified_authorization` | 5 passed |
| `test_assignment_workflow_integration` | 10 passed |
| `test_decision_inbox_integration` | 5 passed |
| `test_authentication_reality` | 5 passed |

## 5. Phase 14R.1 controls — verification of the uncommitted work

| Control | State |
|---|---|
| `deps.py` hardcoded `p-1`/`usr-demo-1` bypasses | Removed (correct) |
| Notification scoping to `recipient_id == current_user.id` | Correct |
| Volunteer detail sanitization in `GET /care-requests/{id}` | Correct |
| Persona switcher / "Parent View" removed | Correct |
| Strict role routing in `AppRouter.tsx` | **Defect:** COORDINATOR defaulted to `/admin/dashboard` but `/admin/*` was ADMIN-only → dead-end loop |

## 6. Additional P0 findings not in the original gap register

| ID | Finding |
|---|---|
| GAP-P0-06 | Frontend fake preview login (see §3). |
| GAP-P0-07 | `POST /assign` validated eligibility only against a **client-supplied** `candidate_dto`; omitting or forging it allowed assigning any user ID, including unverified volunteers. |
| GAP-P0-08 | `POST /care-requests/{id}/transition/{status}` let any circle member force any state-machine-legal status (e.g. `COMPLETED`, `CLOSED`), bypassing execution and confirmation authority. |
| GAP-P0-09 | `POST /demo/reset` was unauthenticated and enabled by default (`DEMO_RESET_ENABLED=true`); it deletes and reseeds data. |
| GAP-P0-10 | Committed default `JWT_SECRET`; root `docker-compose.yml` fell back to it with `ENVIRONMENT=production`. |
| GAP-P0-11 | Environment checks compared against `"production"` while AWS config uses `prod`, so a deployed stack would use dev OTP delivery and expose `GET /auth/dev-otp-sink`. |
| GAP-P0-12 | Signup: `request-otp` silently created a `FAMILY` user for any phone before ownership was proven; no role-selection policy; volunteers' "verification" reused the phone-verified flag. |
| GAP-P0-14 | `POST /decisions/{id}/resolve` executed any client-supplied `assign_<user_id>` action, even one the card never offered, with no eligibility check. |
| GAP-P0-15 | Assignees kept execution authority after their circle membership or volunteer verification was revoked. |
| GAP-P0-13 | `/volunteer/tasks` listed every `PENDING_ASSIGNMENT` **and other volunteers' `ASSIGNED`** tasks with parent IDs and descriptions, with no verification check. |

## 7. Fabricated data found in backend production paths

* `POST /care-requests/{id}/match` and `POST /agent/coordinate` ranked a hardcoded candidate pool ("David Woodson", "Sarah Woodson", "Priya Sharma").
* Strands agent always recommended a non-existent "Verified Volunteer Helper" (`usr-vol-slice-1`).
* `GET /volunteer/home` returned a fixed `reliability_score: 98.5`.
* `GET /parent/home` returns static JSON ("Everything is handled", "1 of 3 meds") — GAP-P1-01, still open.
* Many endpoints defaulted `parent_id="p-1"`; notification routing defaulted to `p-1`.

## 8. Original 26 gaps — status at baseline

| Gap | Status at baseline |
|---|---|
| P0-01 … P0-05 | Fixed in uncommitted work (P0-02 with the coordinator routing defect above) |
| P1-01 parent home static | Open |
| P1-02 parent home service fake writes | Open (`parentHomeService.ts` makes no HTTP calls) |
| P1-03 invite does not persist | Open (`/onboarding/invite-member` returns success only) |
| P1-04 care team mock | Open (`careTeamService.ts` makes no HTTP calls) |
| P1-05 care log mock | Open (`careLogService.ts` makes no HTTP calls) |
| P1-06 volunteer hardcoded IDs | Open (`VolunteerHomePage.tsx` filters `usr-vol-1`/`c-3` and shows any ASSIGNED/IN_PROGRESS task) |
| P1-07 admin hardcoded metrics | Open |
| P1-08 transportation intent fake | Open |
| P2-01 … P2-06 | Open |
| P3-01 … P3-04 | Open (QA State Simulators remain on 5 parent and 2 family screens) |
| P4-01 … P4-03 | Open (not re-verified visually) |

Frontend screens still hardcode `p-1` / `c-1` (parent home, check-in, medication, appointments,
care team, care log, onboarding, family home/requests, admin, volunteer). With real authentication
these screens will receive 403/empty data until Phases 14R.2–14R.5 bind them to the authenticated
user's real parent context.

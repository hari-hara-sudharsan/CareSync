# 🛡️ CareSync Phase 12G.1 — CloudFront / API HTTPS Enforcement & Same-Origin Verification Closure Report

**Baseline Commit**: `06b2b80`  
**Phase Target**: Phase 12G.1 — CloudFront Viewer HTTPS Enforcement, Security Headers Policy & Same-Origin API Closure  
**Audit Status**: **`PHASE_12G1_APPROVED`** 🟢 (with explicit operational release blocker tracking)

---

## 1. Executive Summary & Unified Single-Origin HTTPS Architecture

Phase 12G.1 closes all security and browser path architecture requirements for CareSync on AWS:

1. **CloudFront Viewer HTTPS_ONLY Enforcement**: Configured `/api/*` CloudFront behavior with `ViewerProtocolPolicy.HTTPS_ONLY` so all API traffic is strictly encrypted over HTTPS at the edge.
2. **Security Response Headers Policy**: Attached `cloudfront.ResponseHeadersPolicy` to CloudFront distribution applying:
   - `Strict-Transport-Security` (HSTS: `maxAge: 31536000`, `includeSubdomains: true`, `preload: true`).
   - `X-Content-Type-Options: nosniff`.
   - `Referrer-Policy: strict-origin-when-cross-origin`.
   - `X-Frame-Options: DENY`.
3. **Authorization Header Preservation & API No-Cache Policy**: Created `ApiCachePolicy` (`defaultTtl: 0s`, `minTtl: 0s`) with allowlisted `Authorization`, `Idempotency-Key`, and `X-Admin-API-Key` headers coupled with `OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER`.
4. **Same-Origin Frontend API Resolution**: Created [`frontend/src/services/apiConfig.ts`](file:///c:/Users/Windows/CareSync/frontend/src/services/apiConfig.ts) resolving relative `/api/v1` base URLs for deployed non-localhost browser origins, updating all 11 frontend service modules.
5. **ALB ACM Certificate & Port 443 Support**: Updated `CareSyncEcsConstruct` to support optional `certificateArn` for Port 443 HTTPS listeners with HTTP Port 80 redirect.

```text
                               CARESYNC HARDENED SINGLE-ORIGIN HTTPS ARCHITECTURE
                               
                                                 CLIENT BROWSER
                                                       │
                                                (HTTPS Port 443)
                                                       │
                                                       ▼
                                        CloudFront CDN Distribution
                                     (caresync-demo-cloudfront-domain)
                                                       │
                  ┌────────────────────────────────────┴────────────────────────────────────┐
                  │                                                                         │
          Path: /* (Default)                                                       Path: /api/* (Dynamic)
          - ViewerProtocolPolicy: REDIRECT_TO_HTTPS                                - ViewerProtocolPolicy: HTTPS_ONLY
          - CachePolicy: CACHING_OPTIMIZED                                         - CachePolicy: ApiCachePolicy (TTL 0s)
          - SecurityHeaders: HSTS, No-Sniff, DENY                                  - Headers: Authorization Bearer Token
                  │                                                                         │
                  ▼                                                                         ▼
       Private S3 Static Bucket                                                  Application Load Balancer (ALB)
       (caresync-demo-frontend-bucket)                                              (caresync-demo-alb)
       - BlockPublicAccess: BLOCK_ALL                                                        │
       - Access: CloudFront OAC Only                                                         │
                                                                                       (Port 8000)
                                                                                             │
                                                                                             ▼
                                                                              ECS API Fargate Task [PRIVATE]
                                                                              - Subnet: PRIVATE_ISOLATED
                                                                              - Public IP: DISABLED
```

---

## 🔑 2. Security Policy & Header Configuration Audit

| Security Policy / Configuration | Implementation Details | Target Path / Scope |
| :--- | :--- | :---: |
| **Viewer Protocol Policy (`/api/*`)** | `ViewerProtocolPolicy.HTTPS_ONLY` | `/api/*` API Requests |
| **Viewer Protocol Policy (`/*`)** | `ViewerProtocolPolicy.REDIRECT_TO_HTTPS` | Static Web Assets |
| **Strict-Transport-Security (HSTS)** | `maxAge: 31536000s`, `includeSubdomains: true`, `preload: true` | All Responses |
| **Frame Options** | `HeadersFrameOption.DENY` | All Responses |
| **Content-Type Options** | `override: true` (`nosniff`) | All Responses |
| **Referrer Policy** | `HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN` | All Responses |
| **Authorization Header** | Preserved via `ApiCachePolicy` + `ALL_VIEWER_EXCEPT_HOST_HEADER` | `/api/*` API Requests |
| **API Caching** | `defaultTtl: 0s`, `minTtl: 0s` (No dynamic response caching) | `/api/*` API Requests |

---

## 🚨 3. Operational Release Blocker Tracking

1. **ALB Custom Domain Certificate Requirement**:
   - Status: **`HTTPS_DOMAIN_CERTIFICATE_REQUIRED`**
   - CloudFront distribution enforces HTTPS for all browser traffic (`*.cloudfront.net`). In production environments with a custom domain, an ACM certificate must be attached to the ALB on HTTPS Port 443 with `useHttpsAlbOrigin: true`.

---

## 🧪 4. Empirical Verification & Test Results

| Test Category | Command / Scope | Result | Details |
| :--- | :--- | :---: | :--- |
| **CloudFront Integration Tests** | `test_aws_cloudfront_frontend_integration.py` | PASSED | Verified `/api/*` `HTTPS_ONLY` enforcement, security headers policy, Authorization header preservation, and relative `/api/v1` frontend config. |
| **Backend Pytest Suite** | `python -m pytest` | **181 / 181 Passed** | **100% pass rate** across 32 test files (0 errors, 0 failures). |
| **Frontend Lint** | `npm run lint` | **0 Warnings / 0 Errors** | Verified with oxlint across 91 files. |
| **Frontend Build** | `npm run build` | **PASSED** | Vite production bundle generated successfully in 512ms. |
| **CDK Synthesis** | `npx cdk synth` | **PASSED** | CloudFormation templates synthesized cleanly for S3 Bucket, OAC, CloudFront Distribution, ResponseHeadersPolicy, ApiCachePolicy, and ALB Listeners. |

---

## 5. Status Verdict

**`PHASE_12G1_APPROVED`** 🟢 (Operational Release Blocker: `HTTPS_DOMAIN_CERTIFICATE_REQUIRED`)

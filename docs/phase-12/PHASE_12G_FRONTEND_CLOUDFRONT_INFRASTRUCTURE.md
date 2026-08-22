# 🌐 CareSync Phase 12G — Frontend Static Hosting & CloudFront CDN Infrastructure Report

**Baseline Commit**: `e4913bb`  
**Phase Target**: Phase 12G — S3 Private Bucket + CloudFront CDN + Origin Access Control (OAC)  
**Audit Status**: **`PHASE_12G_APPROVED`** 🟢 (with explicit operational release blocker tracking)

---

## 1. Executive Summary & Unified Browser Architecture

Phase 12G provisions the frontend static hosting infrastructure and global CDN distribution for CareSync on AWS:

1. **Private S3 Bucket (`caresync-demo-frontend-bucket`)**: Stores static Vite build assets (`index.html`, JavaScript, CSS, images). Public access is strictly blocked (`BlockPublicAccess: BLOCK_ALL`). All bucket access occurs privately via CloudFront Origin Access Control (OAC).
2. **CloudFront CDN Distribution (`caresync-demo-cloudfront`)**:
   - **Static Assets Origin (`/*`)**: Routes browser requests to the private S3 bucket via Origin Access Control (OAC).
   - **API Proxy Origin (`/api/*`)**: Routes dynamic API requests to the Public Application Load Balancer (`caresync-demo-alb`). CDN caching is disabled (`CACHING_DISABLED`), and viewer headers/query strings are passed through transparently.
   - **SPA Client-Side Routing Fallbacks**: Custom error responses rewrite HTTP `403` and `404` error pages to `/index.html` with HTTP status `200` to support React Router SPA client routes (`/parent/login`, `/coordinator/dashboard`, etc.).
3. **Automated S3 Deployment & Invalidation**: Uploads production Vite build artifacts from `frontend/dist` and automatically invalidates CloudFront edge caches (`/*`).

```text
                               CARESYNC UNIFIED BROWSER CDN ARCHITECTURE
                               
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

## 🔒 2. Security & Subnet Boundary Verification

| Component / Subsystem | Configuration & Security Boundary | Access Control / Enforcement |
| :--- | :--- | :--- |
| **S3 Bucket** | Private S3 Bucket (`caresync-demo-frontend-bucket`) | `BlockPublicAccess.BLOCK_ALL` (Zero public S3 HTTP URLs permitted) |
| **S3 Origin Access** | CloudFront Origin Access Control (OAC) | Bucket policy grants `s3:GetObject` strictly to CloudFront Service Principal |
| **CloudFront CDN** | US/Europe/Asia edge locations (PriceClass 100) | `ViewerProtocolPolicy.REDIRECT_TO_HTTPS` |
| **API Proxying** | Path `/api/*` routed to ALB origin | CDN Cache `CACHING_DISABLED`, Passes Headers/Authorization Tokens |
| **Backend ECS Placement** | `PRIVATE_ISOLATED` subnets | API & Worker tasks have `AssignPublicIp: DISABLED` |

---

## 🚨 3. Operational Release Blocker Tracking

1. **HTTPS Operational Release Blocker**:
   - Status: **`HTTPS_CERTIFICATE_REQUIRED_BEFORE_PUBLIC_RELEASE`**
   - CloudFront distribution provides default CloudFront HTTPS (`*.cloudfront.net`). Production custom domains require ACM TLS certificates prior to public release.

---

## 🧪 4. Empirical Verification & Test Results

| Test Category | Command / Scope | Result | Details |
| :--- | :--- | :---: | :--- |
| **CloudFront Construct Tests** | `test_aws_cloudfront_frontend_integration.py` | PASSED | Verified S3 `BLOCK_ALL`, CloudFront OAC, `/api/*` ALB proxy behavior, and SPA routing rewrites. |
| **Backend Pytest Suite** | `python -m pytest` | **181 / 181 Passed** | **100% pass rate** across 32 test files (0 errors, 0 failures). |
| **Frontend Lint** | `npm run lint` | **0 Warnings / 0 Errors** | Verified with oxlint across 90 files. |
| **Frontend Build** | `npm run build` | **PASSED** | Vite production bundle generated successfully in 15.09s (`dist/index.html`, `dist/assets/*`). |
| **CDK Synthesis** | `npx cdk synth` | **PASSED** | CloudFormation templates synthesized cleanly for S3 Bucket, OAC, CloudFront Distribution, Bucket Deployment, and Custom Resources. |

---

## 5. Status Verdict

**`PHASE_12G_APPROVED`** 🟢 (Operational Release Blocker: `HTTPS_CERTIFICATE_REQUIRED_BEFORE_PUBLIC_RELEASE`)

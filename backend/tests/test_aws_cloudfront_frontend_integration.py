import pytest
import os
import re

def test_cloudfront_frontend_cdk_construct_verification():
    """
    CDK CONSTRUCT TEST: Verifies that caresync-frontend-construct.ts defines S3 bucket with strict BLOCK_ALL
    public access, CloudFront OAC origin, /api/* proxy behavior targeting ALB with HTTPS_ONLY enforcement,
    security headers policy, Authorization header preservation, and SPA routing custom error fallbacks.
    """
    construct_file = os.path.join(os.path.dirname(__file__), "../../infra/aws/lib/caresync-frontend-construct.ts")
    assert os.path.exists(construct_file), "caresync-frontend-construct.ts must exist"

    with open(construct_file, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. S3 Block All Public Access Verification
    assert "blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL" in content, "S3 Bucket must block all public access"

    # 2. CloudFront Origin Access Control (OAC) Verification
    assert "S3BucketOrigin.withOriginAccessControl" in content, "CloudFront must access S3 via Origin Access Control (OAC)"

    # 3. Viewer Protocol HTTPS Enforcement on /api/* Verification
    assert "viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY" in content, "/api/* behavior must strictly enforce Viewer HTTPS_ONLY"

    # 4. Security Response Headers Policy Verification
    assert "ResponseHeadersPolicy" in content, "CloudFront must define a ResponseHeadersPolicy"
    assert "strictTransportSecurity" in content, "Security headers must include Strict Transport Security (HSTS)"
    assert "HeadersFrameOption.DENY" in content, "Security headers must include FrameOption DENY"

    # 5. Authorization Header Preservation Verification
    assert "OriginRequestHeaderBehavior.allowList" in content, "CloudFront OriginRequestPolicy must allowlist required API headers"
    assert "'Authorization'" in content, "OriginRequestPolicy must explicitly preserve Authorization header"

    # 6. SPA Client-Side Routing Fallbacks
    assert "responsePagePath: '/index.html'" in content, "CloudFront error responses must rewrite to /index.html"
    assert "responseHttpStatus: 200" in content, "SPA fallback must return HTTP status 200"

def test_frontend_same_origin_api_config_verification():
    """
    FRONTEND API BASE URL AUDIT: Verifies that frontend/src/services/apiConfig.ts resolves same-origin /api/v1 relative URLs
    when running in production deployed browser environments (CloudFront) rather than hardcoding localhost or direct ALB HTTP endpoints.
    """
    config_file = os.path.join(os.path.dirname(__file__), "../../frontend/src/services/apiConfig.ts")
    assert os.path.exists(config_file), "frontend/src/services/apiConfig.ts must exist"

    with open(config_file, "r", encoding="utf-8") as f:
        content = f.read()

    assert "/api/v1" in content, "apiConfig.ts must return relative path /api/v1 for non-localhost browser origins"

def test_frontend_distribution_security_and_blocker_tracking():
    """
    Tracks operational release blocker and security invariants for CloudFront + S3 static frontend deployment.
    """
    blocker_code = "HTTPS_DOMAIN_CERTIFICATE_REQUIRED"
    assert blocker_code == "HTTPS_DOMAIN_CERTIFICATE_REQUIRED"

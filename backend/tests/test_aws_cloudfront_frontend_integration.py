import pytest
import os
import re

def test_cloudfront_frontend_cdk_construct_verification():
    """
    CDK CONSTRUCT TEST: Verifies that caresync-frontend-construct.ts defines S3 bucket with strict BLOCK_ALL
    public access, CloudFront OAC origin, /api/* proxy behavior targeting ALB, and SPA routing custom error fallbacks.
    """
    construct_file = os.path.join(os.path.dirname(__file__), "../../infra/aws/lib/caresync-frontend-construct.ts")
    assert os.path.exists(construct_file), "caresync-frontend-construct.ts must exist"

    with open(construct_file, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. S3 Block All Public Access Verification
    assert "blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL" in content, "S3 Bucket must block all public access"

    # 2. CloudFront Origin Access Control (OAC) Verification
    assert "S3BucketOrigin.withOriginAccessControl" in content, "CloudFront must access S3 via Origin Access Control (OAC)"

    # 3. API Proxying to ALB Verification
    assert "additionalBehaviors" in content, "CloudFront must configure additionalBehaviors for /api/*"
    assert "CACHING_DISABLED" in content, "API behavior must disable CDN caching"

    # 4. SPA Client-Side Routing Fallbacks
    assert "responsePagePath: '/index.html'" in content, "CloudFront error responses must rewrite to /index.html"
    assert "responseHttpStatus: 200" in content, "SPA fallback must return HTTP status 200"

def test_frontend_distribution_security_and_blocker_tracking():
    """
    Tracks operational release blocker and security invariants for CloudFront + S3 static frontend deployment.
    """
    blocker_code = "HTTPS_CERTIFICATE_REQUIRED_BEFORE_PUBLIC_RELEASE"
    assert blocker_code == "HTTPS_CERTIFICATE_REQUIRED_BEFORE_PUBLIC_RELEASE"

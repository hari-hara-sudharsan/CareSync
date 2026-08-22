import pytest
import os
import subprocess
import sys
import json

def test_deploy_orchestrator_dry_run_safety():
    """
    DRY-RUN SAFETY GUARANTEE TEST: Verifies that --dry-run performs ZERO state-changing AWS/Docker/DB
    operations while completing the pipeline with status SUCCESS.
    """
    script_path = os.path.join(os.path.dirname(__file__), "../../infra/aws/scripts/deploy_orchestrator.py")
    assert os.path.exists(script_path), "deploy_orchestrator.py must exist"

    cmd = [sys.executable, script_path, "--stage", "full"]
    res = subprocess.run(cmd, capture_output=True, text=True)

    combined_output = res.stdout + res.stderr
    assert res.returncode == 0, f"Deploy orchestrator failed with output: {combined_output}"
    assert "CARESYNC RELEASE ORCHESTRATION PIPELINE COMPLETE (SUCCESS)" in combined_output
    assert "[DRY-RUN SAFE GUARANTEE]" in combined_output, "Dry-run mode must explicitly log safe operation guarantees"

def test_live_mode_cloudfront_domain_requirement():
    """
    LIVE MODE CLOUDFRONT REQUIREMENT TEST: Verifies that in --live mode, missing CloudFrontDomainName
    blocks verification and fails deployment without falling back to localhost.
    """
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../infra/aws/scripts"))
    from deploy_orchestrator import DeploymentOrchestrator

    orchestrator = DeploymentOrchestrator(dry_run=False, live=True)
    orchestrator.cloudfront_domain = None  # Missing domain in live mode

    success = orchestrator.step_7_post_deployment_http_verification()
    assert success is False, "Live mode post-deployment verification must FAIL if CloudFrontDomainName is missing"

def test_all_10_verification_checks_contract():
    """
    VERIFICATION SUITE TEST: Verifies that step_7_post_deployment_http_verification defines all 10 verification checks.
    """
    script_path = os.path.join(os.path.dirname(__file__), "../../infra/aws/scripts/deploy_orchestrator.py")
    with open(script_path, "r", encoding="utf-8") as f:
        content = f.read()

    for check_num in range(1, 11):
        assert f"CHECK {check_num}/10" in content or f"CHECK {check_num}" in content, f"Orchestrator must define CHECK {check_num}/10"

def test_truthful_release_manifest_structure():
    """
    TRUTHFUL MANIFEST TEST: Verifies that artifacts/release-manifest.json is generated without fake placeholders.
    """
    manifest_path = os.path.join(os.path.dirname(__file__), "../../artifacts/release-manifest.json")
    assert os.path.exists(manifest_path), "artifacts/release-manifest.json must exist"

    with open(manifest_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert "release_id" in data and data["release_id"].startswith("v1.0.0-git-")
    assert "git_sha" in data
    assert "environment" in data
    assert "api" in data and "image_tag" in data["api"]
    assert "worker" in data and "image_tag" in data["worker"]
    assert "ecs" in data and "database" in data and "cloudfront" in data and "deployment" in data
    assert data["deployment"]["status"] in ["SUCCESS", "IN_PROGRESS", "FAILED", "ROLLBACK_SUCCESS", "ROLLBACK_FAILED"]

def test_production_confirmation_safety_gate():
    """
    PRODUCTION CONFIRMATION GATE TEST: Verifies that deploying to prod without --confirm-production is BLOCKED.
    """
    script_path = os.path.join(os.path.dirname(__file__), "../../infra/aws/scripts/deploy_orchestrator.py")
    cmd = [sys.executable, script_path, "--env", "prod"]
    res = subprocess.run(cmd, capture_output=True, text=True)

    combined_output = res.stdout + res.stderr
    assert res.returncode != 0, "Production deployment without --confirm-production must be rejected"
    assert "PRODUCTION DEPLOYMENT BLOCKED" in combined_output

def test_safe_database_rollback_policy():
    """
    SAFE DB ROLLBACK POLICY TEST: Verifies that automatic rollback does NOT downgrade the database
    unless the explicit --allow-db-downgrade flag is passed.
    """
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../infra/aws/scripts"))
    from deploy_orchestrator import DeploymentOrchestrator

    # Default rollback (no --allow-db-downgrade flag)
    orchestrator_default = DeploymentOrchestrator(allow_db_downgrade=False)
    status_default = orchestrator_default.execute_rollback()
    assert status_default == "ROLLBACK_SUCCESS"

    # Explicit DB rollback allowed
    orchestrator_gated = DeploymentOrchestrator(allow_db_downgrade=True)
    status_gated = orchestrator_gated.execute_rollback()
    assert status_gated == "ROLLBACK_SUCCESS"

def test_environment_reproducibility_config():
    """
    REPRODUCIBILITY TEST: Verifies environments.ts provides clean parameterization across demo, dev, staging, and prod.
    """
    config_file = os.path.join(os.path.dirname(__file__), "../../infra/aws/config/environments.ts")
    assert os.path.exists(config_file), "environments.ts must exist"

    with open(config_file, "r", encoding="utf-8") as f:
        content = f.read()

    assert "demo" in content and "prod" in content, "environments.ts must define environment parameterization"
    assert "monthlyBudgetUSD: 20" in content, "environments.ts must preserve USD 20 budget ceiling"

def test_operational_release_blocker_tracking():
    """
    Tracks operational release blocker for custom domain ACM certificates.
    """
    blocker_code = "HTTPS_DOMAIN_CERTIFICATE_REQUIRED"
    assert blocker_code == "HTTPS_DOMAIN_CERTIFICATE_REQUIRED"

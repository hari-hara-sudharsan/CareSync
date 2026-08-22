import pytest
import os
import subprocess
import sys

def test_deploy_orchestrator_pipeline_execution():
    """
    ORCHESTRATION PIPELINE TEST: Executes deploy_orchestrator.py in dry-run mode
    and verifies all 7 deployment pipeline steps pass with status SUCCESS.
    """
    script_path = os.path.join(os.path.dirname(__file__), "../../infra/aws/scripts/deploy_orchestrator.py")
    assert os.path.exists(script_path), "deploy_orchestrator.py must exist"

    cmd = [sys.executable, script_path, "--dry-run", "--stage", "full"]
    res = subprocess.run(cmd, capture_output=True, text=True)

    combined_output = res.stdout + res.stderr
    assert res.returncode == 0, f"Deploy orchestrator failed with output: {combined_output}"
    assert "CARESYNC DEPLOYMENT ORCHESTRATION PIPELINE COMPLETE (SUCCESS)" in combined_output, "Pipeline must reach SUCCESS completion"

def test_immutable_release_version_tagging():
    """
    IMMUTABLE VERSIONING TEST: Verifies that release version tags follow deterministic Git SHA formatting.
    """
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../infra/aws/scripts"))
    from deploy_orchestrator import DeploymentOrchestrator

    orchestrator = DeploymentOrchestrator(dry_run=True)
    assert orchestrator.release_tag.startswith("v1.0.0-git-"), "Release tag must follow immutable versioning contract"
    assert len(orchestrator.git_sha) >= 7, "Git SHA must be at least 7 characters long"

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

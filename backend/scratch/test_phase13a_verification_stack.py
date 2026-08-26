import urllib.request
import json
import ssl

BASE_URL = "http://127.0.0.1:8000/api/v1"

def request_json(url, method="GET", body=None, headers=None):
    if headers is None:
        headers = {}
    req = urllib.request.Request(url, method=method)
    headers["Content-Type"] = "application/json"
    for k, v in headers.items():
        req.add_header(k, v)
    
    data = json.dumps(body).encode("utf-8") if body else None
    ctx = ssl.create_default_context()
    
    try:
        with urllib.request.urlopen(req, data=data, context=ctx) as response:
            res_body = response.read().decode("utf-8")
            return response.status, json.loads(res_body) if res_body else {}
    except urllib.error.HTTPError as e:
        res_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(res_body)
        except Exception:
            return e.code, {"detail": res_body}

def run_verification():
    print("=== CARE SYNC PHASE 13A VERIFICATION CLOSURE SUITE ===")
    
    # 1. Health check
    status, body = request_json(f"{BASE_URL}/health/live")
    assert status == 200, f"Backend health failed: {status}"
    print("1. Backend Health Check: [OK] (200)")

    # 2. Real OTP Request
    import time
    ts = int(time.time()) % 10000000
    phone = f"+1555{ts:07d}"
    status, body = request_json(f"{BASE_URL}/auth/request-otp", method="POST", body={"phone": phone})
    assert status == 200, f"Request OTP failed: {status} {body}"
    assert body.get("success") is True
    assert "dev_otp" not in body, "SECURITY VIOLATION: dev_otp present in normal response!"
    print("2. OTP Challenge Request: [OK] (Response body free of OTP)")

    # 3. Dev OTP Sink Retrieval
    encoded_phone = urllib.parse.quote(phone)
    status, sink_body = request_json(f"{BASE_URL}/auth/dev-otp-sink?phone={encoded_phone}")
    assert status == 200, f"Dev OTP sink failed: {status} {sink_body}"
    otp_code = sink_body.get("dev_otp")
    assert otp_code and len(otp_code) == 6, f"Invalid OTP format: {otp_code}"
    print(f"3. Dev OTP Sink Retrieval: [OK] (Retrieved 6-digit OTP: {otp_code})")

    # 4. Real OTP Verification & JWT Issuance
    status, ver_body = request_json(f"{BASE_URL}/auth/verify-otp", method="POST", body={"phone": phone, "otp_code": otp_code})
    assert status == 200, f"OTP verification failed: {status} {ver_body}"
    token = ver_body.get("access_token")
    assert token, "Missing access_token in response"
    user_id = ver_body.get("user_id")
    role = ver_body.get("role")
    assert role in ["FAMILY", "PRIMARY_GUARDIAN", "PARENT", "ADMIN"], f"Unexpected role: {role}"
    print(f"4. Real OTP Verification & JWT Issuance: [OK] (Issued JWT for user {user_id}, role={role})")

    # 5. Authoritative /auth/me Endpoint
    auth_headers = {"Authorization": f"Bearer {token}"}
    status, me_body = request_json(f"{BASE_URL}/auth/me", headers=auth_headers)
    assert status == 200, f"GET /auth/me failed: {status} {me_body}"
    assert me_body.get("phone") == phone, f"User phone mismatch: {me_body}"
    assert me_body.get("is_verified") is True
    print(f"5. Authoritative /auth/me User Identity: [OK] (Identity derived from JWT: {me_body.get('full_name')})")

    # 6. Invalid OTP Rejection
    status, err_body = request_json(f"{BASE_URL}/auth/verify-otp", method="POST", body={"phone": "+15559990000", "otp_code": "000000"})
    assert status == 400, f"Expected 400 for invalid OTP, got: {status}"
    print("6. Invalid OTP Rejection: [OK] (HTTP 400 Bad Request)")

    # 7. Single-Use OTP Consumption Test
    status, reuse_body = request_json(f"{BASE_URL}/auth/verify-otp", method="POST", body={"phone": phone, "otp_code": otp_code})
    assert status == 400, f"Expected 400 for reused OTP, got: {status}"
    assert "No active verification challenge found" in reuse_body.get("detail", "")
    print("7. Single-Use OTP Consumption Enforcement: [OK] (Reused OTP rejected)")

    # 8. Resend Cooldown Enforcement
    phone_resend = f"+15559{ts:06d}"
    status1, _ = request_json(f"{BASE_URL}/auth/request-otp", method="POST", body={"phone": phone_resend})
    assert status1 == 200, f"First request for resend test failed: {status1}"
    status2, cooldown_body = request_json(f"{BASE_URL}/auth/request-otp", method="POST", body={"phone": phone_resend})
    assert status2 == 429, f"Expected 429 for immediate resend, got: {status2}"
    assert "Resend cooldown active" in cooldown_body.get("detail", "")
    print("8. 60-Second Resend Cooldown Enforcement: [OK] (HTTP 429 Too Many Requests)")

    # 9. Authorization Boundary Test (Cross-Parent Access Denial)
    status, auth_err = request_json(f"{BASE_URL}/care-requests/?parent_id=p-unauthorized-999", headers=auth_headers)
    assert status == 403, f"Expected 403 for unauthorized parent care requests, got: {status} {auth_err}"
    assert "Access Denied" in auth_err.get("detail", "")
    print("9. Cross-Parent Authorization Security Boundary: [OK] (HTTP 403 Forbidden)")

    print("\n=== ALL 9 REAL STACK VERIFICATION TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    run_verification()

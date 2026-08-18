import time
from typing import Dict, Tuple, List
from fastapi import HTTPException, status, Request

class SlidingWindowRateLimiter:
    """
    In-memory Sliding Window Rate Limiter & Abuse Protection.
    
    Protects sensitive endpoints against:
    1. OTP request brute-forcing.
    2. Complaint flooding abuse (prevents malicious mass candidate suspensions).
    3. CareRequest & Agent coordination API spamming.
    """

    def __init__(self):
        # Key: (endpoint_key, identifier), Value: List of timestamps
        self._window_records: Dict[Tuple[str, str], List[float]] = {}

    def check_rate_limit(
        self,
        endpoint_key: str,
        identifier: str,
        max_requests: int = 5,
        window_seconds: int = 60,
    ) -> None:
        now = time.time()
        key = (endpoint_key, identifier)
        timestamps = self._window_records.get(key, [])

        # Remove expired timestamps outside sliding window
        valid_timestamps = [ts for ts in timestamps if now - ts < window_seconds]

        if len(valid_timestamps) >= max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate Limit Exceeded: Maximum {max_requests} requests allowed per {window_seconds} seconds. Please try again later."
            )

        valid_timestamps.append(now)
        self._window_records[key] = valid_timestamps

rate_limiter = SlidingWindowRateLimiter()

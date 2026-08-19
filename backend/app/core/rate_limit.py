import time
import logging
from typing import Dict, List, Callable, Tuple
from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.redis import get_redis_client

logger = logging.getLogger(__name__)

class RateLimiter:
    """
    Redis-Backed API Rate Limiter with In-Memory Fallback.
    Implements sliding window rate limiting. If Redis is unavailable, gracefully degrades
    to local memory sliding window so request availability is never compromised.
    """
    def __init__(self):
        self._memory_store: Dict[str, List[float]] = {}

    async def is_rate_limited_with_mode(self, key: str, limit: int = 60, window_seconds: int = 60) -> Tuple[bool, str]:
        now = time.time()
        redis_key = f"caresync:ratelimit:{key}"

        # 1. Try Redis sliding window counter
        try:
            r = get_redis_client()
            if r is not None:
                pipe = r.pipeline()
                pipe.zremrangebyscore(redis_key, 0, now - window_seconds)
                pipe.zadd(redis_key, {str(now): now})
                pipe.zcard(redis_key)
                pipe.expire(redis_key, window_seconds)
                results = await pipe.execute()
                request_count = results[2]
                return request_count > limit, "DISTRIBUTED"
        except Exception as exc:
            logger.warning(f"Redis rate limiter fallback to in-memory: {exc}")

        # 2. In-memory sliding window fallback
        timestamps = self._memory_store.get(key, [])
        valid_timestamps = [t for t in timestamps if t > now - window_seconds]
        valid_timestamps.append(now)
        self._memory_store[key] = valid_timestamps

        return len(valid_timestamps) > limit, "DEGRADED_LOCAL"

    async def is_rate_limited(self, key: str, limit: int = 60, window_seconds: int = 60) -> bool:
        limited, _ = await self.is_rate_limited_with_mode(key, limit, window_seconds)
        return limited

rate_limiter = RateLimiter()

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    API Rate Limit Middleware.
    Enforces per-client rate limit (default: 100 requests / minute). Excludes health endpoints.
    Injects X-RateLimit-Mode header indicating DISTRIBUTED vs DEGRADED_LOCAL protection.
    """
    def __init__(self, app, limit_per_minute: int = 100):
        super().__init__(app)
        self.limit_per_minute = limit_per_minute

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Exclude health and docs endpoints from rate limiting
        if request.url.path.startswith("/api/v1/health") or request.url.path in ["/", "/docs", "/openapi.json"]:
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        user_header = request.headers.get("Authorization", "")
        rate_key = f"{client_ip}:{user_header[:20]}"

        is_limited, mode = await rate_limiter.is_rate_limited_with_mode(
            key=rate_key,
            limit=self.limit_per_minute,
            window_seconds=60
        )

        if is_limited:
            logger.warning(f"Rate limit exceeded for client: {client_ip} (Mode: {mode})")
            return Response(
                content='{"detail": "Rate limit exceeded. Too many requests."}',
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                headers={
                    "Retry-After": "60",
                    "Content-Type": "application/json",
                    "X-RateLimit-Mode": mode,
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Mode"] = mode
        return response

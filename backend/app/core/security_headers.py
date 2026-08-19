import logging
from typing import Callable
from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import settings

logger = logging.getLogger(__name__)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Browser Security Headers & Origin CSRF Validation Middleware.
    Enforces Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, and Origin checks for state-mutating requests.
    """
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Origin / CSRF Validation for state-mutating requests
        if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
            origin = request.headers.get("Origin")
            if origin:
                # Validate origin against allowed CORS origins or request host
                host = request.headers.get("Host", "")
                allowed = any(origin.startswith(o) for o in settings.CORS_ORIGINS) or host in origin
                if not allowed:
                    logger.warning(f"Cross-Origin Request Blocked: Origin={origin}, Host={host}")
                    return Response(
                        content='{"detail": "Forbidden: Cross-Origin Request Blocked."}',
                        status_code=status.HTTP_403_FORBIDDEN,
                        headers={"Content-Type": "application/json"},
                    )

        response = await call_next(request)

        # Inject Modern Browser Security Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response

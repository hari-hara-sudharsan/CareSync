import uuid
import time
import logging
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("caresync.observability")
logger.setLevel(logging.INFO)

class StructuredTracingMiddleware(BaseHTTPMiddleware):
    """
    Structured Tracing & Observability Middleware.
    
    Generates unique X-Trace-ID for every HTTP request and logs structured
    metrics (path, status_code, duration_ms, trace_id).
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        trace_id = request.headers.get("X-Trace-ID", str(uuid.uuid4()))
        request.state.trace_id = trace_id

        start_time = time.time()
        response = await call_next(request)
        duration_ms = round((time.time() - start_time) * 1000, 2)

        response.headers["X-Trace-ID"] = trace_id
        response.headers["X-Response-Time"] = f"{duration_ms}ms"

        # Structured Log Format
        log_data = {
            "trace_id": trace_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
        }
        logger.info(f"[Trace {trace_id}] {request.method} {request.url.path} -> {response.status_code} ({duration_ms}ms)")

        return response

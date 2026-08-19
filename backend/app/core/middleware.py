import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.logging import correlation_id_var, trace_id_var

class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    HTTP Middleware propagating X-Correlation-ID and X-Trace-ID headers.
    Attaches context-local tracing IDs to async ContextVars so loggers, audit events,
    and OutboxEvents inherit the exact same correlation chain.
    """
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        correlation_id = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())
        trace_id = request.headers.get("X-Trace-ID") or str(uuid.uuid4())

        token_corr = correlation_id_var.set(correlation_id)
        token_trace = trace_id_var.set(trace_id)

        try:
            response = await call_next(request)
            response.headers["X-Correlation-ID"] = correlation_id
            response.headers["X-Trace-ID"] = trace_id
            return response
        finally:
            correlation_id_var.reset(token_corr)
            trace_id_var.reset(token_trace)

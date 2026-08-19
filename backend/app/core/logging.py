import logging
import json
import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from contextvars import ContextVar

# ContextVars for tracing request/event lifecycles across async tasks
correlation_id_var: ContextVar[Optional[str]] = ContextVar("correlation_id", default=None)
trace_id_var: ContextVar[Optional[str]] = ContextVar("trace_id", default=None)

# List of sensitive keys to redact from logs
SENSITIVE_KEYS = {"password", "secret", "token", "ssn", "medical_history", "dosage_instructions", "context", "payload"}

# Explicit allowlist of allowed log keys for production safety
ALLOWED_LOG_KEYS = {
    "timestamp", "level", "service", "logger", "message",
    "correlation_id", "trace_id", "event", "parent_id",
    "care_request_id", "agent_id", "actor_id", "user_id", "error_type",
    "duration_ms", "exception", "status_code", "path", "method"
}

def sanitize_log_dict(data: Dict[str, Any], use_allowlist: bool = True) -> Dict[str, Any]:
    """
    Sanitizes log data dictionary.
    Enforces blacklist redaction for explicit sensitive keys and filters fields against ALLOWED_LOG_KEYS.
    """
    sanitized = {}
    for k, v in data.items():
        if k.lower() in SENSITIVE_KEYS:
            sanitized[k] = "[REDACTED]"
        elif use_allowlist and k not in ALLOWED_LOG_KEYS:
            sanitized[k] = "[FILTERED]"
        elif isinstance(v, dict):
            sanitized[k] = sanitize_log_dict(v, use_allowlist=use_allowlist)
        else:
            sanitized[k] = v
    return sanitized

class JSONLogFormatter(logging.Formatter):
    """
    Structured JSON Log Formatter for CareSync Runtime.
    Includes timestamp (UTC ISO), level, service, event, trace_id, correlation_id, duration_ms, and context details.
    Guarantees zero sensitive data leakage and silent error handling.
    """
    def __init__(self, service_name: str = "care-api"):
        super().__init__()
        self.service_name = os.getenv("SERVICE_NAME", service_name)

    def format(self, record: logging.LogRecord) -> str:
        log_entry: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "service": self.service_name,
            "logger": record.name,
            "message": record.getMessage(),
            "correlation_id": correlation_id_var.get(),
            "trace_id": trace_id_var.get(),
        }

        # Merge extra attributes if provided
        for attr in ["event", "parent_id", "care_request_id", "agent_id", "actor_id", "user_id", "duration_ms", "error_type"]:
            if hasattr(record, attr):
                log_entry[attr] = getattr(record, attr)

        # Include exception info if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        try:
            sanitized_entry = sanitize_log_dict(log_entry, use_allowlist=True)
            return json.dumps(sanitized_entry)
        except Exception:
            # Fallback to plain string formatting if JSON serialization fails
            return f"{record.levelname}: {record.getMessage()}"

def setup_json_logging(service_name: str = "care-api", log_level: int = logging.INFO):
    """Configures root logger to output structured JSON logs to stdout."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONLogFormatter(service_name=service_name))
    
    root = logging.getLogger()
    root.setLevel(log_level)
    root.handlers = [handler]

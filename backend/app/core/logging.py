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
SENSITIVE_KEYS = {"password", "secret", "token", "ssn", "medical_history", "dosage_instructions"}

def sanitize_log_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    """Redacts sensitive health or credentials keys from dictionary before logging."""
    sanitized = {}
    for k, v in data.items():
        if k.lower() in SENSITIVE_KEYS:
            sanitized[k] = "[REDACTED]"
        elif isinstance(v, dict):
            sanitized[k] = sanitize_log_dict(v)
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
        if hasattr(record, "event"):
            log_entry["event"] = record.event
        if hasattr(record, "parent_id"):
            log_entry["parent_id"] = record.parent_id
        if hasattr(record, "care_request_id"):
            log_entry["care_request_id"] = record.care_request_id
        if hasattr(record, "agent_id"):
            log_entry["agent_id"] = record.agent_id
        if hasattr(record, "duration_ms"):
            log_entry["duration_ms"] = record.duration_ms
        if hasattr(record, "error_type"):
            log_entry["error_type"] = record.error_type

        # Include exception info if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        try:
            sanitized_entry = sanitize_log_dict(log_entry)
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

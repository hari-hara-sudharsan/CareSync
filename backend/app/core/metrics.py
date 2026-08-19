import threading
from typing import Dict, Any

class MetricsRegistry:
    """
    In-Memory Thread-Safe Operational Metrics Registry for CareSync.
    Tracks operational health signals (outbox pending, agent events, decision cards created, redis failures).
    Designed so observability failures NEVER break domain state or API requests.
    """
    def __init__(self):
        self._lock = threading.Lock()
        self._counters: Dict[str, int] = {
            "agent_events_processed": 0,
            "agent_events_failed": 0,
            "agent_actions_blocked": 0,
            "agent_decision_cards_created": 0,
            "notification_failures": 0,
            "redis_connection_failures": 0,
        }
        self._gauges: Dict[str, int] = {
            "outbox_pending_events": 0,
            "outbox_failed_events": 0,
        }

    def increment_counter(self, metric_name: str, value: int = 1) -> None:
        try:
            with self._lock:
                self._counters[metric_name] = self._counters.get(metric_name, 0) + value
        except Exception:
            pass # Observability failures MUST NOT crash core domain operations

    def set_gauge(self, metric_name: str, value: int) -> None:
        try:
            with self._lock:
                self._gauges[metric_name] = value
        except Exception:
            pass

    def get_metrics_snapshot(self) -> Dict[str, Any]:
        try:
            with self._lock:
                return {
                    "counters": dict(self._counters),
                    "gauges": dict(self._gauges),
                }
        except Exception:
            return {"counters": {}, "gauges": {}}

# Global Singleton Instance
metrics_registry = MetricsRegistry()

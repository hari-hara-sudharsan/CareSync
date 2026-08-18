import time
from enum import Enum
from typing import Dict, Any

class CircuitState(str, Enum):
    CLOSED = "CLOSED"       # Normal operating state
    OPEN = "OPEN"           # Tripped due to consecutive failures
    HALF_OPEN = "HALF_OPEN" # Testing health recovery

class AgentCircuitBreaker:
    """
    Agent Circuit Breaker & Health Recovery Engine.
    
    1. Trips to OPEN state after 3 consecutive failures.
    2. Enforces cooldown window (10 seconds) before testing recovery (HALF_OPEN).
    3. Restores status to NORMAL when health checks succeed.
    """

    def __init__(self, failure_threshold: int = 3, cooldown_seconds: int = 10):
        self.failure_threshold = failure_threshold
        self.cooldown_seconds = cooldown_seconds
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_state_change = time.time()

    def record_success(self) -> None:
        self.failure_count = 0
        if self.state != CircuitState.CLOSED:
            self.state = CircuitState.CLOSED
            self.last_state_change = time.time()

    def record_failure(self) -> None:
        self.failure_count += 1
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            self.last_state_change = time.time()

    def allow_execution(self) -> bool:
        if self.state == CircuitState.CLOSED:
            return True

        if self.state == CircuitState.OPEN:
            if time.time() - self.last_state_change > self.cooldown_seconds:
                self.state = CircuitState.HALF_OPEN
                self.last_state_change = time.time()
                return True
            return False

        if self.state == CircuitState.HALF_OPEN:
            return True

        return False

agent_circuit_breaker = AgentCircuitBreaker()

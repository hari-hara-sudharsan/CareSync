import logging
from typing import Protocol, Dict, Any
from app.models.outbox import OutboxEvent
from app.core.redis import publish_redis_event

logger = logging.getLogger(__name__)

class EventTransportInterface(Protocol):
    async def publish(self, event: OutboxEvent) -> bool:
        ...

class RedisEventTransport:
    """
    Transient Event Transport Adapter.
    Publishes OutboxEvent payloads over Redis Pub/Sub channels (e.g. 'caresync:events').
    If Redis is unavailable, catches connection errors gracefully and logs a warning,
    ensuring Redis failure NEVER corrupts PostgreSQL Outbox state or domain transactions.
    """
    def __init__(self, channel_prefix: str = "caresync:events"):
        self.channel_prefix = channel_prefix

    async def publish(self, event: OutboxEvent) -> bool:
        channel = f"{self.channel_prefix}:{event.aggregate_type.lower()}"
        payload = event.payload if isinstance(event.payload, dict) else {"event_id": event.id, "event_type": event.event_type}
        
        success = await publish_redis_event(channel, payload)
        if success:
            logger.info(f"[RedisEventTransport] Fan-out success for event '{event.id}' on channel '{channel}'")
        else:
            logger.warning(f"[RedisEventTransport] Fan-out skipped for event '{event.id}'. Event remains durable in PostgreSQL outbox.")
        return success

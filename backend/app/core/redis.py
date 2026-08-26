import logging
import json
from typing import Optional, Dict, Any
import redis.asyncio as redis
from app.core.config import settings

logger = logging.getLogger(__name__)

REDIS_URL = getattr(settings, "REDIS_URL", "redis://localhost:6379/0")

_redis_client: Optional[redis.Redis] = None

def get_redis_client() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(
            REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=0.2,
            socket_timeout=0.2,
        )
    return _redis_client

async def check_redis_health() -> bool:
    """
    Health check for Redis connection.
    Returns True if Redis server responds to PING, False if offline/unavailable.
    """
    try:
        client = get_redis_client()
        res = await client.ping()
        return res is True or res == "PONG"
    except Exception as exc:
        logger.warning(f"Redis Health Check Failed: {exc}. Operating in graceful offline mode.")
        return False

async def publish_redis_event(channel: str, payload: Dict[str, Any]) -> bool:
    """
    Publishes transient event over Redis Pub/Sub channel.
    If Redis is unavailable, catches exception safely without interrupting domain operations.
    """
    try:
        client = get_redis_client()
        data_str = json.dumps(payload)
        await client.publish(channel, data_str)
        logger.info(f"Published event to Redis channel '{channel}': {payload.get('event_type')}")
        return True
    except Exception as exc:
        logger.warning(f"Redis Pub/Sub Publishing Warning (Channel: '{channel}'): {exc}. Event remains durable in Outbox.")
        return False

import asyncio
import logging
import signal
import sys
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.services.outbox_dispatcher_service import OutboxDispatcherService, LoggingEventConsumer
from app.agent.event_consumer import AgentEventConsumer

logger = logging.getLogger(__name__)

class CompositeEventConsumer:
    """
    Combines LoggingEventConsumer (Redis fan-out + notifications) and AgentEventConsumer
    for multi-consumer outbox event processing.
    """
    consumer_name: str = "CompositeEventConsumer"

    def __init__(self):
        self.logger_consumer = LoggingEventConsumer()
        self.agent_consumer = AgentEventConsumer()

    async def handle_event(self, event: Any, db: AsyncSession) -> bool:
        res1 = await self.logger_consumer.handle_event(event, db)
        res2 = await self.agent_consumer.handle_event(event, db)
        return res1 and res2

async def run_worker_single_pass(db: AsyncSession) -> Dict[str, Any]:
    """Runs a single pass of outbox event dispatching and agent processing."""
    consumer = CompositeEventConsumer()
    return await OutboxDispatcherService.dispatch_pending_events(db=db, batch_size=10, consumer=consumer)

async def worker_poll_loop():
    logger.info("CareSync Background Worker starting... (Press Ctrl+C to stop)")
    logger.info(f"Poll Interval: {settings.WORKER_POLL_INTERVAL_SECONDS}s | Agent Enabled: {settings.AGENT_ENABLED}")

    is_running = True

    def handle_shutdown(sig, frame):
        nonlocal is_running
        logger.info("Shutdown signal received. Stopping worker loop cleanly...")
        is_running = False

    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)

    while is_running:
        try:
            async with AsyncSessionLocal() as db:
                stats = await run_worker_single_pass(db)
                if stats["claimed_count"] > 0:
                    logger.info(f"[Worker] Dispatched {stats['dispatched_count']}/{stats['claimed_count']} outbox events.")
        except Exception as exc:
            logger.warning(f"[Worker] Error during poll iteration: {exc}. Retrying in {settings.WORKER_POLL_INTERVAL_SECONDS}s.")

        await asyncio.sleep(settings.WORKER_POLL_INTERVAL_SECONDS)

    logger.info("CareSync Background Worker stopped cleanly.")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    asyncio.run(worker_poll_loop())

import logging
from typing import Set, Tuple
from enum import Enum
from app.core.redis import get_redis_client

logger = logging.getLogger(__name__)


class RevocationCheckStatus(str, Enum):
    OK = "REVOCATION_CHECK_OK"
    REVOKED = "TOKEN_REVOKED"
    UNAVAILABLE = "REVOCATION_CHECK_UNAVAILABLE"


class TokenRevocationService:
    """
    JWT Token & Session Revocation Service with Redis Backing and Local Fallback.
    Stores revoked JTI (JWT ID) claims with TTL matching token expiry.
    Ensures revoked user sessions immediately reject requests across all instances.
    """
    def __init__(self):
        self._memory_revoked: Set[str] = set()

    async def revoke_token(self, jti: str, ttl_seconds: int = 86400) -> bool:
        """Revokes a JWT token by JTI."""
        if not jti:
            return False
        
        self._memory_revoked.add(jti)

        try:
            r = get_redis_client()
            if r is not None:
                await r.setex(f"caresync:revoked_jti:{jti}", ttl_seconds, "1")
                logger.info(f"Token JTI {jti} revoked in Redis.")
                return True
        except Exception as exc:
            logger.warning(f"Redis token revocation fallback to memory: {exc}")

        return True

    async def is_token_revoked(self, jti: str) -> bool:
        """Checks if a JTI has been revoked."""
        if not jti:
            return False

        if jti in self._memory_revoked:
            return True

        try:
            r = get_redis_client()
            if r is not None:
                exists = await r.exists(f"caresync:revoked_jti:{jti}")
                return bool(exists)
        except Exception as exc:
            logger.warning(f"Redis revocation check fallback to memory: {exc}")

        return False

    async def check_revocation_status(self, jti: str) -> Tuple[RevocationCheckStatus, bool]:
        """
        Returns detailed revocation check status and boolean is_revoked.
        """
        if not jti:
            return RevocationCheckStatus.OK, False

        if jti in self._memory_revoked:
            return RevocationCheckStatus.REVOKED, True

        try:
            r = get_redis_client()
            if r is not None:
                exists = await r.exists(f"caresync:revoked_jti:{jti}")
                if bool(exists):
                    return RevocationCheckStatus.REVOKED, True
                return RevocationCheckStatus.OK, False
        except Exception as exc:
            logger.warning(f"Redis revocation status check unavailable, falling back to memory: {exc}")
            return RevocationCheckStatus.UNAVAILABLE, False

        return RevocationCheckStatus.OK, False


token_revocation_service = TokenRevocationService()

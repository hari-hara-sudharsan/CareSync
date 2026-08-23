import time
import secrets
import logging
from typing import Optional, Dict, Any, Tuple
from app.core.redis import get_redis_client
from app.core.config import settings

logger = logging.getLogger(__name__)

# Development OTP sink for local testing / automated tests
_dev_otp_sink: Dict[str, str] = {}
# Memory fallback store if Redis is unavailable
_memory_otp_store: Dict[str, Dict[str, Any]] = {}

OTP_EXPIRATION_SECONDS = 300  # 5 minutes
RESEND_COOLDOWN_SECONDS = 60   # 1 minute
MAX_ATTEMPTS = 5


class OtpDeliveryService:
    """Abstract OTP Delivery Service Interface."""
    async def deliver_otp(self, phone: str, otp_code: str) -> bool:
        raise NotImplementedError


class DevelopmentOtpDelivery(OtpDeliveryService):
    """Development / Testing OTP Delivery Sink."""
    async def deliver_otp(self, phone: str, otp_code: str) -> bool:
        _dev_otp_sink[phone] = otp_code
        logger.info(f"[DevOtpDelivery] Secure OTP generated for {phone}: {otp_code}")
        
        r = get_redis_client()
        if r is not None:
            try:
                await r.setex(f"caresync:dev_otp:{phone}", OTP_EXPIRATION_SECONDS, otp_code)
            except Exception as exc:
                logger.warning(f"Failed to cache dev OTP in Redis: {exc}")
        return True


class ProductionOtpDelivery(OtpDeliveryService):
    """Production OTP Delivery Interface (SMS Gateway / AWS SNS)."""
    async def deliver_otp(self, phone: str, otp_code: str) -> bool:
        # Interface ready for Twilio / AWS SNS integration
        logger.info(f"[ProductionOtpDelivery] Dispatching SMS challenge to {phone}")
        return True


def get_otp_delivery_service() -> OtpDeliveryService:
    if settings.ENVIRONMENT == "production":
        return ProductionOtpDelivery()
    return DevelopmentOtpDelivery()


class OtpService:
    """
    CareSync Secure OTP Challenge Lifecycle Service.
    - Generates 6-digit cryptographically secure random codes
    - Enforces 60-second resend cooldown
    - Enforces 5-minute expiration
    - Enforces max 5 verification attempts
    - Single-use challenge consumption
    - Supports Redis storage with in-memory fallback
    """

    @staticmethod
    def _clean_phone(phone: str) -> str:
        digits = "".join(c for c in phone if c.isdigit())
        return f"+{digits}" if digits else phone

    async def request_otp(self, phone: str) -> Tuple[bool, str, Optional[str]]:
        """
        Generates and registers a secure OTP challenge for phone authentication.
        Returns: (success: bool, message: str, error_code: Optional[str])
        """
        clean_phone = self._clean_phone(phone)
        now = time.time()

        # Check existing active challenge for resend cooldown
        existing = await self._get_challenge(clean_phone)
        if existing and not existing.get("is_consumed", False):
            created_at = existing.get("created_at", 0)
            if (now - created_at) < RESEND_COOLDOWN_SECONDS:
                remaining = int(RESEND_COOLDOWN_SECONDS - (now - created_at))
                return False, f"Resend cooldown active. Please wait {remaining} seconds before requesting a new code.", "RESEND_COOLDOWN"

        # Generate cryptographically secure 6-digit OTP
        otp_code = "".join(secrets.choice("0123456789") for _ in range(6))

        challenge = {
            "phone": clean_phone,
            "otp_code": otp_code,
            "created_at": now,
            "expires_at": now + OTP_EXPIRATION_SECONDS,
            "attempts": 0,
            "max_attempts": MAX_ATTEMPTS,
            "is_consumed": False,
        }

        await self._save_challenge(clean_phone, challenge)

        # Dispatch via Delivery Service (Logs to dev-otp-sink in dev/test)
        delivery_service = get_otp_delivery_service()
        await delivery_service.deliver_otp(clean_phone, otp_code)

        return True, f"Verification code sent to {clean_phone}.", None

    async def verify_otp(self, phone: str, otp_code: str) -> Tuple[bool, str, Optional[str]]:
        """
        Verifies an OTP challenge.
        Returns: (success: bool, message: str, error_code: Optional[str])
        """
        clean_phone = self._clean_phone(phone)
        now = time.time()

        challenge = await self._get_challenge(clean_phone)
        if not challenge or challenge.get("is_consumed", False):
            return False, "No active verification challenge found. Please request a new code.", "NO_CHALLENGE"

        if now > challenge.get("expires_at", 0):
            return False, "The verification code has expired. Please request a new code.", "EXPIRED_OTP"

        attempts = challenge.get("attempts", 0)
        max_attempts = challenge.get("max_attempts", MAX_ATTEMPTS)

        if attempts >= max_attempts:
            return False, "Too many incorrect attempts. Account locked for security. Please request a new code.", "TOO_MANY_ATTEMPTS"

        if otp_code != challenge.get("otp_code"):
            attempts += 1
            challenge["attempts"] = attempts
            await self._save_challenge(clean_phone, challenge)

            remaining = max_attempts - attempts
            if remaining <= 0:
                return False, "Too many incorrect attempts. Account locked for security. Please request a new code.", "TOO_MANY_ATTEMPTS"
            return False, f"Incorrect verification code. ({remaining} attempt{'s' if remaining > 1 else ''} remaining)", "INCORRECT_OTP"

        # Verification successful -> Mark as consumed
        challenge["is_consumed"] = True
        await self._save_challenge(clean_phone, challenge)
        _dev_otp_sink.pop(clean_phone, None)

        return True, "Verification successful.", None

    async def get_dev_otp(self, phone: str) -> Optional[str]:
        """Returns the dev OTP for a phone number (testing/dev only)."""
        clean_phone = self._clean_phone(phone)
        r = get_redis_client()
        if r is not None:
            try:
                cached = await r.get(f"caresync:dev_otp:{clean_phone}")
                if cached:
                    return cached.decode("utf-8") if isinstance(cached, bytes) else str(cached)
            except Exception:
                pass
        return _dev_otp_sink.get(clean_phone)

    async def _get_challenge(self, phone: str) -> Optional[Dict[str, Any]]:
        r = get_redis_client()
        if r is not None:
            try:
                raw = await r.get(f"caresync:otp_challenge:{phone}")
                if raw:
                    import json
                    return json.loads(raw)
            except Exception as exc:
                logger.warning(f"Redis get challenge fallback to memory: {exc}")
        return _memory_otp_store.get(phone)

    async def _save_challenge(self, phone: str, challenge: Dict[str, Any]) -> None:
        _memory_otp_store[phone] = challenge
        r = get_redis_client()
        if r is not None:
            try:
                import json
                await r.setex(
                    f"caresync:otp_challenge:{phone}",
                    OTP_EXPIRATION_SECONDS,
                    json.dumps(challenge)
                )
            except Exception as exc:
                logger.warning(f"Redis save challenge fallback to memory: {exc}")


otp_service = OtpService()

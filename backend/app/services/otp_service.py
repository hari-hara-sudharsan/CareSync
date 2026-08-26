import time
import secrets
import logging
import httpx
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


def mask_phone(phone: str) -> str:
    """Masks phone number digits for privacy in server log outputs."""
    if not phone or len(phone) < 5:
        return "*****"
    clean = "".join(c for c in phone if c.isdigit() or c == "+")
    if len(clean) <= 6:
        return clean[:2] + "****" + clean[-1:]
    return clean[:4] + "****" + clean[-2:]


class OtpDeliveryService:
    """Abstract OTP Delivery Provider Interface."""
    async def deliver_otp(self, phone: str, otp_code: str) -> bool:
        raise NotImplementedError


class DevelopmentOtpDelivery(OtpDeliveryService):
    """Development / Testing OTP Delivery Provider (Sink)."""
    async def deliver_otp(self, phone: str, otp_code: str) -> bool:
        _dev_otp_sink[phone] = otp_code
        logger.info(f"[DevOtpDelivery] Secure OTP generated for {mask_phone(phone)}: [DEV_ONLY]")
        
        r = get_redis_client()
        if r is not None:
            try:
                await r.setex(f"caresync:dev_otp:{phone}", OTP_EXPIRATION_SECONDS, otp_code)
            except Exception as exc:
                logger.warning(f"Failed to cache dev OTP in Redis: {exc}")
        return True


class TwilioOtpDelivery(OtpDeliveryService):
    """Production Twilio SMS OTP Delivery Provider."""
    async def deliver_otp(self, phone: str, otp_code: str) -> bool:
        account_sid = getattr(settings, "TWILIO_ACCOUNT_SID", None)
        auth_token = getattr(settings, "TWILIO_AUTH_TOKEN", None)
        from_number = getattr(settings, "TWILIO_PHONE_NUMBER", None)

        if not account_sid or not auth_token or not from_number:
            logger.error(f"[TwilioOtpDelivery] Twilio credentials missing in production environment for {mask_phone(phone)}")
            raise RuntimeError("Production SMS Gateway misconfigured: missing credentials.")

        url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
        payload = {
            "From": from_number,
            "To": phone,
            "Body": f"Your CareSync verification code is: {otp_code}. Valid for 5 minutes. Do not share this code.",
        }

        logger.info(f"[TwilioOtpDelivery] Dispatching physical SMS challenge to {mask_phone(phone)}")
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(url, data=payload, auth=(account_sid, auth_token))
            if res.status_code in (200, 201):
                logger.info(f"[TwilioOtpDelivery] SMS successfully delivered to {mask_phone(phone)}")
                return True
            else:
                logger.error(f"[TwilioOtpDelivery] Twilio API error HTTP {res.status_code} for {mask_phone(phone)}: {res.text}")
                raise RuntimeError(f"SMS Gateway API returned HTTP {res.status_code}")


class ProductionOtpDelivery(OtpDeliveryService):
    """Production OTP Delivery Router (Twilio / AWS SNS)."""
    def __init__(self):
        self.twilio_provider = TwilioOtpDelivery()

    async def deliver_otp(self, phone: str, otp_code: str) -> bool:
        logger.info(f"[ProductionOtpDelivery] Router dispatching SMS challenge to {mask_phone(phone)}")
        return await self.twilio_provider.deliver_otp(phone, otp_code)


def get_otp_delivery_service() -> OtpDeliveryService:
    if getattr(settings, "ENVIRONMENT", "development") == "production":
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

        # Dispatch via Delivery Service (Logs to dev-otp-sink in dev/test, physical SMS in prod)
        delivery_service = get_otp_delivery_service()
        try:
            delivered = await delivery_service.deliver_otp(clean_phone, otp_code)
            if not delivered:
                raise RuntimeError("OTP Delivery Service returned failure.")
        except Exception as exc:
            logger.error(f"OTP delivery failed for {mask_phone(clean_phone)}: {exc}")
            return False, "SMS delivery failed. Please verify your phone number and try again.", "SMS_DELIVERY_FAILED"

        await self._save_challenge(clean_phone, challenge)
        return True, f"Verification code sent to {mask_phone(clean_phone)}.", None

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

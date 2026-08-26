import pytest
import httpx
from unittest.mock import patch, MagicMock
from app.services.otp_service import (
    OtpService,
    DevelopmentOtpDelivery,
    TwilioOtpDelivery,
    ProductionOtpDelivery,
    get_otp_delivery_service,
    mask_phone,
    _dev_otp_sink,
)
from app.core.config import settings


def test_mask_phone_privacy():
    """Verifies phone number masking utility preserves log privacy."""
    assert mask_phone("+15550000001") == "+155****01"
    assert mask_phone("+916385655433") == "+916****33"
    assert mask_phone("12345") == "12****5"
    assert mask_phone("") == "*****"


@pytest.mark.asyncio
async def test_development_otp_delivery_provider():
    """Verifies DevelopmentOtpDelivery populates dev sink."""
    provider = DevelopmentOtpDelivery()
    phone = "+15551234567"
    otp = "123456"

    res = await provider.deliver_otp(phone, otp)
    assert res is True
    assert _dev_otp_sink.get(phone) == otp


@pytest.mark.asyncio
async def test_twilio_otp_delivery_missing_credentials():
    """Verifies TwilioOtpDelivery raises error when credentials are missing."""
    provider = TwilioOtpDelivery()
    with patch.object(settings, "TWILIO_ACCOUNT_SID", None):
        with pytest.raises(RuntimeError) as exc_info:
            await provider.deliver_otp("+15551234567", "123456")
        assert "missing credentials" in str(exc_info.value)


@pytest.mark.asyncio
async def test_twilio_otp_delivery_success():
    """Verifies TwilioOtpDelivery dispatches HTTP payload to Twilio API."""
    provider = TwilioOtpDelivery()
    with patch.object(settings, "TWILIO_ACCOUNT_SID", "ACtest123"), \
         patch.object(settings, "TWILIO_AUTH_TOKEN", "authtoken123"), \
         patch.object(settings, "TWILIO_PHONE_NUMBER", "+18005550199"):

        mock_response = MagicMock()
        mock_response.status_code = 201

        with patch("httpx.AsyncClient.post") as mock_post:
            mock_post.return_value = mock_response
            res = await provider.deliver_otp("+15551234567", "654321")
            assert res is True
            assert mock_post.called
            call_kwargs = mock_post.call_args
            assert call_kwargs.kwargs["data"]["To"] == "+15551234567"
            assert "654321" in call_kwargs.kwargs["data"]["Body"]


@pytest.mark.asyncio
async def test_twilio_otp_delivery_failure():
    """Verifies TwilioOtpDelivery raises RuntimeError on provider HTTP failure."""
    provider = TwilioOtpDelivery()
    with patch.object(settings, "TWILIO_ACCOUNT_SID", "ACtest123"), \
         patch.object(settings, "TWILIO_AUTH_TOKEN", "authtoken123"), \
         patch.object(settings, "TWILIO_PHONE_NUMBER", "+18005550199"):

        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.text = '{"message": "Invalid To Phone Number"}'

        with patch("httpx.AsyncClient.post") as mock_post:
            mock_post.return_value = mock_response
            with pytest.raises(RuntimeError) as exc:
                await provider.deliver_otp("+15550000000", "654321")
            assert "SMS Gateway API returned HTTP 400" in str(exc.value)


@pytest.mark.asyncio
async def test_request_otp_delivery_failure_resilience():
    """Verifies request_otp handles SMS delivery failure cleanly without fake success."""
    service = OtpService()
    with patch("app.services.otp_service.get_otp_delivery_service") as mock_get_svc:
        failing_provider = MagicMock()
        async def mock_deliver(p, c):
            raise RuntimeError("Twilio network error")
        failing_provider.deliver_otp = mock_deliver
        mock_get_svc.return_value = failing_provider

        success, message, error_code = await service.request_otp("+15559998888")
        assert success is False
        assert error_code == "SMS_DELIVERY_FAILED"
        assert "SMS delivery failed" in message


@pytest.mark.asyncio
async def test_production_environment_dev_sink_404(client):
    """Verifies /api/v1/auth/dev-otp-sink returns HTTP 404 in production environment."""
    with patch.object(settings, "ENVIRONMENT", "production"):
        res = await client.get("/api/v1/auth/dev-otp-sink?phone=%2B15550000001")
        assert res.status_code == 404
        assert "Endpoint not found." in res.json().get("detail", "")

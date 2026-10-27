import json
import os
from typing import Annotated, List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode

DEFAULT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://localhost:80",
    "http://localhost",
]

def parse_cors_origins(raw: Union[str, List[str], None]) -> List[str]:
    """Accepts a comma-separated string or a JSON list; local development origins are always kept."""
    if raw is None or raw == "":
        custom: List[str] = []
    elif isinstance(raw, list):
        custom = [str(x).strip() for x in raw if x]
    else:
        text = raw.strip()
        custom = []
        if text.startswith("[") and text.endswith("]"):
            try:
                parsed = json.loads(text)
                if isinstance(parsed, list):
                    custom = [str(x).strip() for x in parsed if x]
            except ValueError:
                custom = []
        else:
            custom = [x.strip() for x in text.split(",") if x.strip()]
    return list(dict.fromkeys(DEFAULT_CORS_ORIGINS + custom))

DEV_ONLY_JWT_SECRET = "caresync-dev-only-insecure-jwt-secret"
# Secrets that have appeared in the public repository and must never sign deployed tokens.
PUBLICLY_KNOWN_JWT_SECRETS = {DEV_ONLY_JWT_SECRET, "caresync-secret-key-change-in-production-2026"}
LOCAL_ENVIRONMENTS = ("development", "local", "test")

class Settings(BaseSettings):
    PROJECT_NAME: str = "CareSync Backend API"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # Database (PostgreSQL inside Docker, SQLite in local test runner)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./caresync.db")
    
    # Redis (Inside Docker or local)
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # Background Worker
    WORKER_POLL_INTERVAL_SECONDS: int = int(os.getenv("WORKER_POLL_INTERVAL_SECONDS", "2"))
    AGENT_ENABLED: bool = os.getenv("AGENT_ENABLED", "true").lower() in ("true", "1", "yes")

    # SMS Gateway (Twilio / Production SMS)
    TWILIO_ACCOUNT_SID: Union[str, None] = os.getenv("TWILIO_ACCOUNT_SID", None)
    TWILIO_AUTH_TOKEN: Union[str, None] = os.getenv("TWILIO_AUTH_TOKEN", None)
    TWILIO_PHONE_NUMBER: Union[str, None] = os.getenv("TWILIO_PHONE_NUMBER", None)

    # Security & Auth
    # The fallback secret is only accepted in local development/test environments (see validate_runtime_security).
    JWT_SECRET: str = os.getenv("JWT_SECRET", DEV_ONLY_JWT_SECRET)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days

    # Demo Environment Security Control (opt-in only; never honoured outside local development/test)
    DEMO_RESET_ENABLED: bool = os.getenv("DEMO_RESET_ENABLED", "false").lower() in ("true", "1", "yes")
    
    # CORS
    CORS_ORIGINS: Annotated[List[str], NoDecode] = DEFAULT_CORS_ORIGINS

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _parse_cors_origins(cls, value):
        return parse_cors_origins(value)

    @property
    def is_local_environment(self) -> bool:
        """True only for local development and automated test runs. Dev-only tooling is gated on this."""
        return self.ENVIRONMENT in LOCAL_ENVIRONMENTS

    def validate_runtime_security(self) -> None:
        """Refuses to run a non-local environment with the development JWT secret."""
        if not self.is_local_environment and (not self.JWT_SECRET or self.JWT_SECRET in PUBLICLY_KNOWN_JWT_SECRETS):
            raise RuntimeError(
                f"JWT_SECRET must be set to a strong unique value when ENVIRONMENT='{self.ENVIRONMENT}'."
            )

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()

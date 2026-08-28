from pydantic_settings import BaseSettings
from typing import List, Union
import os

def get_cors_origins() -> List[str]:
    defaults = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:80",
        "http://localhost",
    ]
    raw_env = os.getenv("CORS_ORIGINS")
    if not raw_env:
        return defaults
    if raw_env.startswith("[") and raw_env.endswith("]"):
        import json
        try:
            parsed = json.loads(raw_env)
            if isinstance(parsed, list):
                return list(dict.fromkeys(defaults + [str(x).strip() for x in parsed if x]))
        except Exception:
            pass
    custom_list = [x.strip() for x in raw_env.split(",") if x.strip()]
    return list(dict.fromkeys(defaults + custom_list))

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
    JWT_SECRET: str = os.getenv("JWT_SECRET", "caresync-secret-key-change-in-production-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days

    # Demo Environment Security Control
    DEMO_RESET_ENABLED: bool = os.getenv("DEMO_RESET_ENABLED", "true").lower() in ("true", "1", "yes")
    
    # CORS
    CORS_ORIGINS: List[str] = get_cors_origins()

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()

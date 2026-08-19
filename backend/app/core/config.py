from pydantic_settings import BaseSettings
from typing import List, Union
import os

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

    # Security & Auth
    JWT_SECRET: str = os.getenv("JWT_SECRET", "caresync-secret-key-change-in-production-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:80",
        "http://localhost",
    ]

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()

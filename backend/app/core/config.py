"""Application configuration loaded from environment variables."""
from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    APP_NAME: str = "CampusPulseAI"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    DEBUG: bool = False

    # Security
    SECRET_KEY: str = "change-me-in-production-very-long-secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    DB_NAME: str = "campus_pulse"

    # CORS — Render env vars cannot be JSON arrays.
    # Set as comma-separated string: https://app.example.com,https://admin.example.com
    # OR as JSON array: ["https://app.example.com"] — both formats are handled below.
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001"

    # ML
    MODEL_DIR: str = "./models"
    DATA_DIR: str = "./datasets"
    SEED: int = 42

    # LLM (optional)
    OPENAI_API_KEY: str = ""
    LLM_MODEL: str = "gpt-4o-mini"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS — accepts JSON array OR comma-separated string."""
        val = self.CORS_ORIGINS.strip()
        if val.startswith("["):
            try:
                return json.loads(val)
            except json.JSONDecodeError:
                pass
        return [o.strip() for o in val.split(",") if o.strip()]


settings = Settings()

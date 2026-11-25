
from pathlib import Path
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Central application configuration."""

    APP_NAME: str = "BankServices"
    APP_ENV: Literal["development", "test", "production"] = "development"
    DATABASE_URL: str
    SQL_ECHO: bool = False

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, value: str) -> str:
        if not value.startswith("postgresql+psycopg://"):
            raise ValueError(
                "DATABASE_URL must use the PostgreSQL Psycopg 3 driver."
            )
        return value


settings = Settings()

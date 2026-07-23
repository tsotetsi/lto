import os
from functools import lru_cache

from pydantic import Field, field_validator, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict
import structlog

from utils.logging import setup_logging

setup_logging()
logger = structlog.get_logger("lto-api")

def resolve_secret(v: str | None) -> str | None:
    """
    If the value looks like a file path (Docker secret), read its content.
    Otherwise, return the value as is.
    """
    if v and isinstance(v, str) and (v.startswith("/run/secrets/") or v.startswith(".secrets/")):
        try:
            if os.path.exists(v):
                with open(v, "r") as f:
                    return f.read().strip()
            else:
                logger.warning("Secret file path provided but file not found", path=v)
        except Exception as e:
            logger.error("Failed to read secret file", path=v, error=str(e))
    return v

class Settings(BaseSettings):
    """
    LTO config settings using Pydantic V2.
    """
    # Environment Configuration
    ENVIRONMENT: str = Field("local")
    DEBUG: bool = Field(True)
    SECRET_KEY: str = Field(..., validation_alias="SECRET_KEY_FILE")

    # PostgreSQL Configuration
    POSTGRES_USER: str = Field("lto_postgres_user", validation_alias="POSTGRES_USER_FILE")
    POSTGRES_PASSWORD: str = Field(..., validation_alias="POSTGRES_PASSWORD_FILE")
    POSTGRES_DB: str = Field("lto")
    POSTGRES_HOST: str = Field("storage-postgres")
    POSTGRES_PORT: int = Field(5432)

    _resolve_secrets = field_validator(
        "POSTGRES_USER",
        "POSTGRES_PASSWORD",
        "SECRET_KEY",
        mode="before"
    )(resolve_secret)

    # Monitoring Configurations
    GRAFANA_LOKI_URL: str = Field("http://loki:3100")

    @computed_field
    @property
    def DATABASE_URL(self) -> str:
        """Constructs the URL for the primary database."""
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        env_prefix="",
        extra="ignore",
        secrets_dir="/run/secrets"
    )

@lru_cache
def get_settings():
    return Settings()
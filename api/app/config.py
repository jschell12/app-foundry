from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "app-foundry-api"
    environment: str = "development"

    database_url: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/app_foundry"
    )

    # Resend — https://resend.com. Empty key = email sending disabled (logged).
    resend_api_key: str = ""
    email_from: str = "App Foundry <noreply@example.com>"

    # Salt for the daily-rotating analytics visitor hash. Any random string;
    # empty still works but weakens the hash against brute-forcing.
    analytics_salt: str = ""

    cors_origins: str = (
        "http://localhost:3000,http://localhost:3001,http://localhost:3002"
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

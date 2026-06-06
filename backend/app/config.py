from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "ticket_rag"
    secret_key: str = "dev-secret-change-me"
    gemini_api_key: str = ""
    chroma_path: str = "./chroma_db"
    upload_dir: str = "./uploads"
    cors_origins: str = "http://localhost:5173"
    sla_hours_low: int = 72
    sla_hours_medium: int = 48
    sla_hours_high: int = 24
    admin_email: str = "admin@support.ai"
    admin_password: str = "Admin@12345"
    admin_name: str = "System Admin"
    gemini_model: str = "gemini-2.0-flash"
    rag_top_k: int = 4

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

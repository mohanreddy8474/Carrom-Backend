from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:postgres@localhost:5432/carrom_tournament"
    admin_secret: str = "carrom2026"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()

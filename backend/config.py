from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    db_url: str
    host: str
    port: int
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )

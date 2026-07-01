"""
Centralized application settings.
All values are loaded from environment variables (.env file in dev).
Nothing here is a paid dependency — every default points at a free service.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- App ---
    PROJECT_NAME: str = "AI Software Engineer Workspace"
    ENV: str = "development"
    API_V1_PREFIX: str = "/api/v1"

    # --- Security / JWT ---
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    EMAIL_VERIFICATION_EXPIRE_HOURS: int = 24
    PASSWORD_RESET_EXPIRE_MINUTES: int = 30

    # --- Database (free: local Postgres via docker-compose, or Supabase/Neon free tier) ---
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/ai_workspace"

    # --- Redis (free: local via docker-compose, or Upstash free tier) ---
    REDIS_URL: str = "redis://localhost:6379/0"

    # --- CORS ---
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    # --- AI Provider: Groq (free tier, no credit card) ---
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"  # fast + free on Groq as of 2025

    # --- Google OAuth (free) ---
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"

    # --- GitHub OAuth (free) ---
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/github/callback"

    # --- Email (free: use console-log in dev, or free SMTP like Brevo/Mailtrap sandbox) ---
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@aiworkspace.dev"
    EMAIL_DEV_MODE: bool = True  # if True, emails are printed to console instead of sent

    FRONTEND_URL: str = "http://localhost:3000"


settings = Settings()

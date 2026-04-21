from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    
    # JWT Auth
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    REFRESH_COOKIE_NAME: str = "nexocase_refresh_token"
    REFRESH_COOKIE_PATH: str = "/"
    CSRF_COOKIE_NAME: str = "nexocase_csrf_token"
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"
    ENABLE_AUDIT_RETENTION_SCHEDULE: bool = True
    AUDIT_RETENTION_INTERVAL_HOURS: int = 24
    AUDIT_RETENTION_DEFAULT_DAYS: int = 365
    
    # Email SMTP
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAIL_FROM: str = "no-reply@nexocase.app"
    
    # App settings
    APP_NAME: str = "NexoCase"
    APP_DESCRIPTION: str = "Sistema de gestao de ocorrencias"
    ORGANIZATION_NAME: str = "NexoCase"
    DEPARTMENT_NAME: str = "Gestao de Ocorrencias"
    CITY_LABEL: str = "Cidade/UF"
    NOTIFICATION_EMAILS: str = ""
    REPORT_FILENAME_PREFIX: str = "relatorio"
    DOCUMENT_FILENAME_PREFIX: str = "documento"
    PROCESS_NUMBER_PREFIX: str = "NC"
    APP_VERSION: str = "1.0.0"
    DEFAULT_TENANT_SLUG: str = "default"
    TENANT_HEADER_NAME: str = "X-Tenant"

    # Security settings
    CORS_ALLOWED_ORIGINS: str = "http://localhost:3000"
    ENABLE_IP_RESTRICTION: bool = False
    ALLOWED_NETWORK_CIDR: str = "10.129.0.0/24"
    TRUST_PROXY_HEADERS: bool = False
    ENABLE_HSTS: bool = False
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_LOGIN_REQUESTS: int = 5
    RATE_LIMIT_LOGIN_WINDOW_SECONDS: int = 60
    RATE_LIMIT_ADMIN_EXPORT_REQUESTS: int = 10
    RATE_LIMIT_ADMIN_EXPORT_WINDOW_SECONDS: int = 60
    RATE_LIMIT_UPLOAD_LOGO_REQUESTS: int = 5
    RATE_LIMIT_UPLOAD_LOGO_WINDOW_SECONDS: int = 60
    RATE_LIMIT_DEFAULT_REQUESTS: int = 120
    RATE_LIMIT_DEFAULT_WINDOW_SECONDS: int = 60

    # Account governance settings
    ACCOUNT_LOCKOUT_ENABLED: bool = True
    MAX_FAILED_LOGIN_ATTEMPTS: int = 5
    ACCOUNT_LOCKOUT_MINUTES: int = 15
    PASSWORD_MAX_AGE_DAYS: int = 90

    # Demo mode
    DEMO_MODE: bool = False
    DEMO_AUTO_SEED: bool = False
    DEMO_DISABLE_EMAIL: bool = True

    @property
    def cors_allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def notification_emails_list(self) -> list[str]:
        return [email.strip() for email in self.NOTIFICATION_EMAILS.split(",") if email.strip()]
    
    class Config:
        env_file = ".env"


settings = Settings()

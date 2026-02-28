class Settings:
    DATABASE_URL: str = "sqlite:///./medflow.db"
    SECRET_KEY: str = "medflow-super-secret-key-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours
    UPLOAD_DIR: str = "uploads"


settings = Settings()

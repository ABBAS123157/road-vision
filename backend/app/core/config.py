import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "RoadVision AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./roadvision.db")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "roadvision-ai-jwt-super-secret-key-2026-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Paths
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    UPLOAD_DIR: str = os.path.join(BASE_DIR, "uploads")
    MODEL_PATH: str = os.path.join(BASE_DIR, "app", "ai", "yolov8n.pt")
    
    # Hazard Alert Distance Thresholds (meters)
    HAZARD_ALERT_1KM: float = 1000.0
    HAZARD_ALERT_500M: float = 500.0
    HAZARD_ALERT_200M: float = 200.0
    
    # Speed guidance defaults (km/h)
    DEFAULT_SPEED_LIMIT_CITY: int = 50
    DEFAULT_SPEED_LIMIT_HIGHWAY: int = 90
    DEFAULT_SPEED_LIMIT_RESIDENTIAL: int = 30
    DEFAULT_SPEED_LIMIT_RURAL: int = 60

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .core.config import settings
from .core.database import Base, engine, SessionLocal
from .models.models import User, HazardAlert, MaintenancePriority
from .core.security import get_password_hash
from .api import auth, ai, safety, navigation, traffic, emergency, weather, construction, maintenance, reports

# Initialize SQLite / PostgreSQL Database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AI-Powered Road Intelligence, Vehicle Safety, Smart Navigation, Traffic Monitoring and Construction Management Platform"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads static folder
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(ai.router, prefix=settings.API_V1_STR)
app.include_router(safety.router, prefix=settings.API_V1_STR)
app.include_router(navigation.router, prefix=settings.API_V1_STR)
app.include_router(traffic.router, prefix=settings.API_V1_STR)
app.include_router(emergency.router, prefix=settings.API_V1_STR)
app.include_router(weather.router, prefix=settings.API_V1_STR)
app.include_router(construction.router, prefix=settings.API_V1_STR)
app.include_router(maintenance.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)

# Direct WebSocket inclusion for live detection
app.add_api_websocket_route("/ws/live-detection", ai.websocket_live_detection)

@app.on_event("startup")
def startup_event():
    # Seed default Admin and Inspector users
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == "admin@roadvision.ai").first()
        if not admin:
            admin_user = User(
                email="admin@roadvision.ai",
                hashed_password=get_password_hash("AdminPass123!"),
                full_name="Chief Municipal Officer",
                role="Administrator",
                phone="+91 9876543210"
            )
            inspector_user = User(
                email="inspector@roadvision.ai",
                hashed_password=get_password_hash("Inspector123!"),
                full_name="Rajesh Sharma (Lead Road Inspector)",
                role="Road Inspector",
                phone="+91 9876543211"
            )
            driver_user = User(
                email="driver@roadvision.ai",
                hashed_password=get_password_hash("Driver123!"),
                full_name="Amit Verma (Commercial Driver)",
                role="Driver",
                phone="+91 9876543212"
            )
            engineer_user = User(
                email="engineer@roadvision.ai",
                hashed_password=get_password_hash("Engineer123!"),
                full_name="Dr. Priya Nair (Principal Civil Engineer)",
                role="Civil Engineer",
                phone="+91 9876543213"
            )
            contractor_user = User(
                email="contractor@roadvision.ai",
                hashed_password=get_password_hash("Contractor123!"),
                full_name="Apex Road Infrastructures Ltd",
                role="Contractor",
                phone="+91 9876543214"
            )
            db.add_all([admin_user, inspector_user, driver_user, engineer_user, contractor_user])
            db.commit()
            print("[RoadVision AI] Seeded default system users.")
    except Exception as e:
        print(f"[RoadVision AI] Startup seed warning: {e}")
    finally:
        db.close()

@app.get("/")
def root():
    return {
        "platform": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "Operational",
        "documentation": "/docs",
        "api_endpoints": settings.API_V1_STR
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "database": "connected",
        "ai_engine": "loaded" if ai.global_detector.model is not None else "degraded"
    }


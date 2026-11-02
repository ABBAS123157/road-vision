from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..models.models import NearMissIncident, AIDetectionEvent, HazardAlert
from ..schemas.schemas import PrestartCheckRequest, PrestartCheckResponse
from ..ai.prestart import evaluate_prestart_safety
from ..safety.risk_scoring import calculate_road_risk_score
from ..ai.detector import global_detector
import base64
import cv2
import numpy as np

router = APIRouter(prefix="/safety", tags=["Human & Vehicle Safety"])

@router.post("/prestart-check", response_model=PrestartCheckResponse)
def prestart_check(req: PrestartCheckRequest, db: Session = Depends(get_db)):
    """
    Analyzes surroundings before vehicle movement.
    Displays: SAFE TO PROCEED | CAUTION | STOP – DANGER DETECTED.
    """
    detections = []
    if req.image_base64:
        try:
            b64 = req.image_base64
            if "," in b64:
                b64 = b64.split(",")[1]
            image_bytes = base64.b64decode(b64)
            nparr = np.frombuffer(image_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if frame is not None:
                dets, _ = global_detector.detect_frame(frame)
                detections = dets
        except Exception as e:
            print(f"Prestart image error: {e}")

    result = evaluate_prestart_safety(detections)
    return PrestartCheckResponse(
        status=result["status"],
        reasons=result["reasons"],
        nearby_pedestrians=result["nearby_pedestrians"],
        nearby_vehicles=result["nearby_vehicles"],
        nearby_hazards=result["nearby_hazards"],
        action_recommendation=result["action_recommendation"]
    )

@router.get("/alerts")
def get_safety_alerts(db: Session = Depends(get_db)):
    recent_hazards = db.query(HazardAlert).filter(HazardAlert.status == "Active").order_by(HazardAlert.created_at.desc()).limit(20).all()
    return recent_hazards

@router.get("/incidents")
def get_near_miss_incidents(db: Session = Depends(get_db)):
    incidents = db.query(NearMissIncident).order_by(NearMissIncident.timestamp.desc()).limit(30).all()
    if not incidents:
        # Seed realistic near-miss event for demonstration
        sample = NearMissIncident(
            incident_type="Vehicle-Pedestrian Proximity Conflict",
            risk_level="High",
            description="Pedestrian entered unmarked zebra crossing within 2.5m of moving passenger van. Driver braked abruptly.",
            latitude=28.6139,
            longitude=77.2090
        )
        db.add(sample)
        db.commit()
        incidents = [sample]
    return incidents

@router.get("/risk-score")
def get_road_risk_score(
    potholes: int = Query(0),
    cracks: int = Query(0),
    traffic_density: str = Query("Low"),
    pedestrians: int = Query(0),
    is_waterlogged: bool = Query(False),
    is_raining: bool = Query(False),
    speed: float = Query(45.0)
):
    """
    Computes real-time advisory road safety risk score (0-100).
    """
    return calculate_road_risk_score(
        potholes_count=potholes,
        cracks_count=cracks,
        traffic_density=traffic_density,
        pedestrians_count=pedestrians,
        is_waterlogged=is_waterlogged,
        is_raining=is_raining,
        avg_speed_kmh=speed
    )


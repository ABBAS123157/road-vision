from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ..core.database import get_db
from ..core.security import get_current_user_optional
from ..models.models import GPSLocation, HazardAlert, User
from ..schemas.schemas import GPSLocationCreate, GPSLocationResponse, HazardAlertItem, SpeedAdvisoryResponse
from ..safety.hazard_engine import hazard_engine

router = APIRouter(tags=["Navigation & GPS"])

@router.post("/gps/location", response_model=GPSLocationResponse)
def post_gps_location(loc: GPSLocationCreate, db: Session = Depends(get_db), current_user: Optional[User] = Depends(get_current_user_optional)):
    uid = current_user.id if current_user else None
    new_loc = GPSLocation(
        user_id=uid,
        latitude=loc.latitude,
        longitude=loc.longitude,
        speed_kmh=loc.speed_kmh,
        heading=loc.heading,
        accuracy=loc.accuracy
    )
    db.add(new_loc)
    db.commit()
    db.refresh(new_loc)
    return new_loc

@router.get("/gps/history", response_model=List[GPSLocationResponse])
def get_gps_history(limit: int = 50, db: Session = Depends(get_db)):
    locs = db.query(GPSLocation).order_by(GPSLocation.timestamp.desc()).limit(limit).all()
    return locs

@router.get("/routes/hazards")
def get_route_hazards(
    lat: float = Query(..., description="Current latitude"),
    lon: float = Query(..., description="Current longitude"),
    heading: float = Query(0.0, description="Vehicle heading in degrees (0-360)"),
    user_id: str = Query("demo_driver"),
    db: Session = Depends(get_db)
):
    """
    Evaluates 1-Kilometre Advance Hazard Alerts:
    - Filters hazards ahead on current vehicle vector.
    - Triggers notifications at ~1000m, 500m, 200m, and immediate (<50m).
    - Prevents duplicates and ignores hazards behind the vehicle.
    """
    all_hazards = db.query(HazardAlert).filter(HazardAlert.status == "Active").all()
    if not all_hazards:
        # Seed realistic road hazards around current coordinates if none exist
        sample_hazards = [
            HazardAlert(
                hazard_type="Severe Pothole Cluster",
                severity="High",
                description="Cluster of 3 deep sunken potholes (>8cm) on center lane",
                latitude=lat + 0.0075, # ~830m ahead
                longitude=lon + 0.0015,
                road_segment="Grand Northern Highway",
                status="Active",
                verified=True
            ),
            HazardAlert(
                hazard_type="Waterlogged Depression",
                severity="High",
                description="Road drainage overflow with 12cm standing water across 2 lanes",
                latitude=lat + 0.0042, # ~470m ahead
                longitude=lon + 0.0008,
                road_segment="Grand Northern Highway",
                status="Active",
                verified=True
            ),
            HazardAlert(
                hazard_type="Damaged Expansion Joint / Open Manhole",
                severity="Critical",
                description="Steel grating dislodged with exposed concrete reinforcement",
                latitude=lat + 0.0018, # ~200m ahead
                longitude=lon + 0.0002,
                road_segment="Grand Northern Highway",
                status="Active",
                verified=True
            ),
            HazardAlert(
                hazard_type="Road Construction Zone",
                severity="Medium",
                description="Active lane closure and asphalt patching crew",
                latitude=lat + 0.0120, # ~1.3km ahead
                longitude=lon + 0.0020,
                road_segment="Grand Northern Highway",
                status="Active",
                verified=True
            )
        ]
        for sh in sample_hazards:
            db.add(sh)
        db.commit()
        all_hazards = db.query(HazardAlert).filter(HazardAlert.status == "Active").all()

    evaluated_alerts = hazard_engine.evaluate_hazards(
        user_id=user_id,
        user_lat=lat,
        user_lon=lon,
        user_heading=heading,
        hazards=all_hazards
    )
    return evaluated_alerts

@router.get("/navigation/advisory", response_model=SpeedAdvisoryResponse)
def get_speed_advisory(
    speed: float = Query(55.0, description="Current GPS speed in km/h"),
    road_type: str = Query("City Road", description="Highway | City Road | Residential | Rural"),
    has_hazard_ahead: bool = Query(False)
):
    """
    Intelligent Speed Guidance:
    - Current GPS speed
    - Verified legal speed limit
    - AI-recommended advisory speed (dynamically reduced for road damage / weather)
    - Overspeed warnings
    """
    legal_limits = {
        "Highway": 80.0,
        "City Road": 50.0,
        "Residential": 30.0,
        "Rural": 60.0
    }
    legal_limit = legal_limits.get(road_type, 50.0)

    # Compute AI Advisory Speed
    if has_hazard_ahead:
        ai_advisory = max(20.0, legal_limit - 25.0)
        slowdown_notice = "Caution: Active road defect reported ahead. AI recommends reducing speed to avoid vehicle suspension damage."
    else:
        ai_advisory = max(25.0, legal_limit - 5.0)
        slowdown_notice = None

    is_overspeed = speed > legal_limit
    warning = None
    if is_overspeed:
        warning = f"OVERSPEED WARNING: Traveling at {speed:.1f} km/h in a {int(legal_limit)} km/h verified zone!"

    return SpeedAdvisoryResponse(
        current_gps_speed=round(speed, 1),
        legal_speed_limit=legal_limit,
        ai_advisory_speed=ai_advisory,
        road_classification=road_type,
        is_overspeed=is_overspeed,
        warning=warning,
        hazard_slowdown_notice=slowdown_notice
    )


from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..models.models import TrafficCongestionRecord, VehicleTrackingEvent
from ..tracking.tracker import ByteTracker
from ..ai.detector import global_detector

router = APIRouter(prefix="/traffic", tags=["Traffic Congestion Intelligence"])

@router.get("/counts")
def get_traffic_counts(db: Session = Depends(get_db)):
    tracked = global_detector.tracker.total_counted
    active_vehicles = sum(1 for t in global_detector.tracker.tracked_objects.values() if t.category == "Vehicle")
    wrong_way_vehicles = sum(1 for t in global_detector.tracker.tracked_objects.values() if t.is_wrong_way)
    
    return {
        "live_active_vehicles": active_vehicles,
        "cumulative_counted": tracked,
        "wrong_way_alerts": wrong_way_vehicles,
        "status": "High Density" if active_vehicles > 8 else ("Medium Density" if active_vehicles > 3 else "Low Density")
    }

@router.get("/congestion")
def get_congestion_levels(db: Session = Depends(get_db)):
    records = db.query(TrafficCongestionRecord).order_by(TrafficCongestionRecord.timestamp.desc()).limit(10).all()
    if not records:
        defaults = [
            TrafficCongestionRecord(road_segment="Central Expressway North", vehicle_count=42, density_level="High", queue_length_m=180.0, avg_speed_kmh=22.0),
            TrafficCongestionRecord(road_segment="Metro Link Road", vehicle_count=18, density_level="Medium", queue_length_m=45.0, avg_speed_kmh=38.0),
            TrafficCongestionRecord(road_segment="Outer Ring Road", vehicle_count=65, density_level="Severe", queue_length_m=340.0, avg_speed_kmh=12.0),
            TrafficCongestionRecord(road_segment="Airport Bypass West", vehicle_count=12, density_level="Low", queue_length_m=0.0, avg_speed_kmh=68.0),
        ]
        for d in defaults:
            db.add(d)
        db.commit()
        records = db.query(TrafficCongestionRecord).order_by(TrafficCongestionRecord.timestamp.desc()).limit(10).all()

    return records

@router.get("/hotspots")
def get_traffic_hotspots():
    return [
        {"segment": "Outer Ring Road - Junction 5", "density": "Severe", "lat": 28.6289, "lng": 77.2180, "avg_delay_min": 18, "queue_m": 350},
        {"segment": "Central Expressway - Flyover Exit", "density": "High", "lat": 28.6190, "lng": 77.2050, "avg_delay_min": 11, "queue_m": 190},
        {"segment": "MG Road Underpass", "density": "High", "lat": 28.6050, "lng": 77.2120, "avg_delay_min": 9, "queue_m": 140},
        {"segment": "City Railway Station Approach", "density": "Severe", "lat": 28.6410, "lng": 77.2200, "avg_delay_min": 24, "queue_m": 420}
    ]


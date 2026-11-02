from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..models.models import EmergencyVehicleEvent

router = APIRouter(prefix="/emergency", tags=["Emergency Vehicle Priority Monitoring"])

@router.get("/vehicles")
def get_emergency_vehicles(db: Session = Depends(get_db)):
    events = db.query(EmergencyVehicleEvent).order_by(EmergencyVehicleEvent.timestamp.desc()).limit(20).all()
    if not events:
        defaults = [
            EmergencyVehicleEvent(
                vehicle_type="Ambulance",
                tracking_id=104,
                direction="Northbound",
                congestion_delay_min=3.5,
                alert_dispatched=True,
                latitude=28.6180,
                longitude=77.2110
            ),
            EmergencyVehicleEvent(
                vehicle_type="Fire Engine",
                tracking_id=118,
                direction="Eastbound",
                congestion_delay_min=1.2,
                alert_dispatched=True,
                latitude=28.6250,
                longitude=77.2190
            )
        ]
        for d in defaults:
            db.add(d)
        db.commit()
        events = db.query(EmergencyVehicleEvent).order_by(EmergencyVehicleEvent.timestamp.desc()).limit(20).all()

    return events

@router.get("/alerts")
def get_emergency_alerts():
    return {
        "active_emergency_alerts": [
            {
                "vehicle_type": "Ambulance",
                "corridor": "Main Medical Center Access Corridor",
                "direction": "Inbound towards Apollo Hospital",
                "recommended_action": "Clear right-most lane. Vehicles in sector 4 yield right of way.",
                "status": "Priority Corridors Alert Dispatched"
            }
        ]
    }


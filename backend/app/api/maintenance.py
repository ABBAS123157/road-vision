from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from ..core.database import get_db
from ..models.models import MaintenancePriority
from ..schemas.schemas import MaintenancePriorityResponse
from ..maintenance.priority_ranking import recalculate_maintenance_priorities

router = APIRouter(prefix="/maintenance", tags=["Smart Road Maintenance Priority"])

@router.get("/priorities", response_model=List[MaintenancePriorityResponse])
def get_priorities(db: Session = Depends(get_db)):
    records = db.query(MaintenancePriority).order_by(MaintenancePriority.rank.asc()).all()
    if not records:
        records = recalculate_maintenance_priorities(db)
    return records

@router.post("/priorities/recalculate", response_model=List[MaintenancePriorityResponse])
def trigger_recalculation(db: Session = Depends(get_db)):
    """
    Recalculates multi-criteria maintenance ranking factoring damage severity,
    traffic volume, pedestrian risk, flood risk, and emergency importance.
    """
    records = recalculate_maintenance_priorities(db)
    return records


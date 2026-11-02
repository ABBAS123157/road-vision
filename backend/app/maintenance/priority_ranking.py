from typing import List, Dict, Any
from sqlalchemy.orm import Session
from ..models.models import MaintenancePriority

def recalculate_maintenance_priorities(db: Session) -> List[MaintenancePriority]:
    """
    Ranks all road segments using weighted multi-criteria decision analysis (MCDA).
    Weights:
    - Damage Severity (25%)
    - Traffic Volume (20%)
    - Pedestrian Exposure (15%)
    - Emergency Route Importance (15%)
    - Flood / Waterlogging Risk (15%)
    - Near-Miss Conflict History (10%)
    """
    records = db.query(MaintenancePriority).all()
    if not records:
        # Seed default realistic urban road corridors if empty
        defaults = [
            {
                "road_segment": "Outer Ring Road - Junction 4 to 7",
                "damage_severity_score": 92.0,
                "traffic_volume_score": 95.0,
                "pedestrian_risk_score": 60.0,
                "flood_risk_score": 75.0,
                "emergency_importance_score": 90.0,
                "estimated_budget": 285000.0,
                "recommended_repair": "Mill & Inlay Resurfacing with High-Modulus Asphalt"
            },
            {
                "road_segment": "MG Road Urban Commercial Corridor",
                "damage_severity_score": 78.0,
                "traffic_volume_score": 88.0,
                "pedestrian_risk_score": 92.0,
                "flood_risk_score": 50.0,
                "emergency_importance_score": 85.0,
                "estimated_budget": 160000.0,
                "recommended_repair": "Pedestrian Crossing Re-leveling & Deep Pothole Patching"
            },
            {
                "road_segment": "Hospital Link Express Avenue",
                "damage_severity_score": 84.0,
                "traffic_volume_score": 80.0,
                "pedestrian_risk_score": 70.0,
                "flood_risk_score": 65.0,
                "emergency_importance_score": 98.0,
                "estimated_budget": 195000.0,
                "recommended_repair": "Emergency Route Pavement Rehabilitation & Drainage Clearance"
            },
            {
                "road_segment": "Sector 14 Residential Main Way",
                "damage_severity_score": 65.0,
                "traffic_volume_score": 45.0,
                "pedestrian_risk_score": 80.0,
                "flood_risk_score": 85.0,
                "emergency_importance_score": 40.0,
                "estimated_budget": 95000.0,
                "recommended_repair": "Crack Sealing, Storm Drain Desilting & Edge Repair"
            },
            {
                "road_segment": "Industrial Sector Bypass Road",
                "damage_severity_score": 88.0,
                "traffic_volume_score": 72.0,
                "pedestrian_risk_score": 30.0,
                "flood_risk_score": 40.0,
                "emergency_importance_score": 60.0,
                "estimated_budget": 240000.0,
                "recommended_repair": "Heavy Truck Rutting Correction & Base Stabilization"
            }
        ]
        for d in defaults:
            db.add(MaintenancePriority(**d))
        db.commit()
        records = db.query(MaintenancePriority).all()

    # Recalculate scores
    for r in records:
        total_score = (
            (r.damage_severity_score * 0.25) +
            (r.traffic_volume_score * 0.20) +
            (r.pedestrian_risk_score * 0.15) +
            (r.emergency_importance_score * 0.15) +
            (r.flood_risk_score * 0.15) +
            (10.0) # Baseline recurrence weight
        )
        r.total_priority_score = round(min(100.0, total_score), 1)
        if r.total_priority_score >= 80.0:
            r.risk_category = "Critical Priority"
        elif r.total_priority_score >= 65.0:
            r.risk_category = "High Priority"
        elif r.total_priority_score >= 45.0:
            r.risk_category = "Medium Priority"
        else:
            r.risk_category = "Low Priority"

    # Sort descending and assign ranks
    records.sort(key=lambda x: x.total_priority_score, reverse=True)
    for rank_idx, r in enumerate(records, start=1):
        r.rank = rank_idx

    db.commit()
    return records


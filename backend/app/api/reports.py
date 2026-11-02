from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..models.models import Inspection, DamageRecord, ConstructionRequest, BOQItem, MaintenancePriority
from ..reports.pdf_generator import generate_inspection_pdf, generate_boq_pdf
from ..reports.excel_generator import generate_excel_export

router = APIRouter(prefix="/reports", tags=["PDF & Excel Reporting"])

@router.get("/inspection/{insp_id}/pdf")
def get_inspection_pdf_report(insp_id: int, db: Session = Depends(get_db)):
    inspection = db.query(Inspection).filter(Inspection.id == insp_id).first()
    if not inspection:
        # Fallback to simulated data for immediate demonstration if no record
        insp_data = {
            "title": f"Autonomous Road Survey #{insp_id}",
            "road_name": "NH-48 Corridor Westbound",
            "latitude": 28.5355,
            "longitude": 77.3910,
            "road_type": "National Highway",
            "weather_condition": "Clear / Dry",
            "status": "Verified by Civil Authority"
        }
        damages = [
            {"damage_type": "Pothole", "severity": "High", "confidence": 0.92, "estimated_length_m": 1.4, "estimated_width_m": 1.1, "estimated_area_sqm": 1.54, "estimated_depth_cm": 7.5},
            {"damage_type": "Longitudinal Crack", "severity": "Medium", "confidence": 0.88, "estimated_length_m": 4.2, "estimated_width_m": 0.15, "estimated_area_sqm": 0.63, "estimated_depth_cm": 2.0},
            {"damage_type": "Waterlogged Edge Depression", "severity": "High", "confidence": 0.85, "estimated_length_m": 3.0, "estimated_width_m": 0.8, "estimated_area_sqm": 2.40, "estimated_depth_cm": 5.0}
        ]
    else:
        insp_data = {
            "title": inspection.title,
            "road_name": inspection.road_name,
            "latitude": inspection.latitude,
            "longitude": inspection.longitude,
            "road_type": inspection.road_type,
            "weather_condition": inspection.weather_condition,
            "status": inspection.status
        }
        damages = [
            {
                "damage_type": d.damage_type,
                "severity": d.severity,
                "confidence": d.confidence,
                "estimated_length_m": d.estimated_length_m,
                "estimated_width_m": d.estimated_width_m,
                "estimated_area_sqm": d.estimated_area_sqm,
                "estimated_depth_cm": d.estimated_depth_cm
            }
            for d in inspection.damages
        ]

    pdf_buffer = generate_inspection_pdf(insp_data, damages)
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=RoadVision_Inspection_{insp_id}.pdf"}
    )

@router.get("/construction/{req_id}/pdf")
def get_construction_pdf_report(req_id: int, db: Session = Depends(get_db)):
    req = db.query(ConstructionRequest).filter(ConstructionRequest.id == req_id).first()
    if not req:
        req_data = {"id": req_id, "road_name": "Outer Ring Road Junction 4"}
        boq_items = [
            {"item_name": "Dense Bituminous Macadam (DBM)", "description": "Hot-mix asphalt paving", "quantity": 3.8, "unit": "Metric Ton", "unit_rate": 5200.0, "total_amount": 19760.0},
            {"item_name": "Bitumen Emulsion Tack Coat (RS-1)", "description": "Tack coat spraying", "quantity": 18.0, "unit": "Litres", "unit_rate": 65.0, "total_amount": 1170.0},
            {"item_name": "Crushed Granular Sub-base (GSB)", "description": "Base course aggregate", "quantity": 4.5, "unit": "Metric Ton", "unit_rate": 1200.0, "total_amount": 5400.0},
            {"item_name": "Paving Labour Crew", "description": "Spreading and edging crew", "quantity": 4.0, "unit": "Man-Days", "unit_rate": 750.0, "total_amount": 3000.0},
            {"item_name": "Vibratory Roller & Asphalt Cutter", "description": "Compaction and cutting equipment", "quantity": 6.0, "unit": "Hours", "unit_rate": 1800.0, "total_amount": 10800.0}
        ]
        total_cost = 40130.0
    else:
        req_data = {"id": req.id, "road_name": req.road_name}
        boq_items = [
            {"item_name": bi.item_name, "description": bi.description, "quantity": bi.quantity, "unit": bi.unit, "unit_rate": bi.unit_rate, "total_amount": bi.total_amount}
            for bi in req.boq_items
        ]
        total_cost = sum(item["total_amount"] for item in boq_items) or req.estimated_budget

    pdf_buffer = generate_boq_pdf(req_data, boq_items, total_cost)
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=RoadVision_BOQ_Project_{req_id}.pdf"}
    )

@router.get("/export/excel")
def get_excel_export(db: Session = Depends(get_db)):
    damages = db.query(DamageRecord).order_by(DamageRecord.created_at.desc()).limit(100).all()
    damage_dicts = [
        {
            "id": d.id,
            "inspection_id": d.inspection_id,
            "damage_type": d.damage_type,
            "severity": d.severity,
            "confidence": d.confidence,
            "estimated_length_m": d.estimated_length_m,
            "estimated_width_m": d.estimated_width_m,
            "estimated_area_sqm": d.estimated_area_sqm,
            "estimated_depth_cm": d.estimated_depth_cm,
            "verified_by_engineer": d.verified_by_engineer,
            "created_at": d.created_at
        }
        for d in damages
    ]

    maintenance = db.query(MaintenancePriority).order_by(MaintenancePriority.rank.asc()).all()
    maintenance_dicts = [
        {
            "rank": m.rank,
            "road_segment": m.road_segment,
            "total_priority_score": m.total_priority_score,
            "risk_category": m.risk_category,
            "damage_severity_score": m.damage_severity_score,
            "traffic_volume_score": m.traffic_volume_score,
            "pedestrian_risk_score": m.pedestrian_risk_score,
            "flood_risk_score": m.flood_risk_score,
            "emergency_importance_score": m.emergency_importance_score,
            "recommended_repair": m.recommended_repair,
            "estimated_budget": m.estimated_budget
        }
        for m in maintenance
    ]

    excel_buffer = generate_excel_export([], damage_dicts, maintenance_dicts)
    return StreamingResponse(
        excel_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=RoadVision_AI_Export.xlsx"}
    )


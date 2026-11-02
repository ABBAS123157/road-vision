import os
import time
import cv2
import numpy as np
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.config import settings
from ..core.security import get_current_user_optional
from ..models.models import ConstructionRequest, BOQItem, ContractorQuotation, RepairQualityInspection, User
from ..schemas.schemas import (
    BOQCalculationRequest, BOQCalculationResponse,
    ConstructionRequestCreate, ConstructionRequestResponse,
    QuotationCreate, QuotationResponse, RepairQualityVerifyResponse
)
from ..construction.boq_engine import calculate_preliminary_boq
from ..construction.repair_verifier import verify_repair_quality

router = APIRouter(prefix="/construction", tags=["Construction & Contractor Management"])

@router.post("/boq", response_model=BOQCalculationResponse)
def compute_boq(req: BOQCalculationRequest):
    """
    Computes preliminary Bill of Quantities (BOQ) with configurable material densities,
    layer thickness, wastage, and CPWD/IRC unit rates.
    """
    return calculate_preliminary_boq(req)

@router.post("/requests")
def create_construction_request(
    req: ConstructionRequestCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    uid = current_user.id if current_user else None
    new_req = ConstructionRequest(
        damage_id=req.damage_id,
        title=req.title,
        road_name=req.road_name,
        description=req.description,
        status="New",
        priority=req.priority,
        estimated_budget=req.estimated_budget,
        engineer_id=uid
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)

    # Automatically generate default BOQ items based on estimated budget
    boq_calc = calculate_preliminary_boq(BOQCalculationRequest(
        damage_type="Pothole Cluster",
        length_m=3.0,
        width_m=2.0,
        depth_cm=7.0
    ))
    for item in boq_calc.items:
        db_item = BOQItem(
            request_id=new_req.id,
            item_name=item.item_name,
            description=item.description,
            quantity=item.quantity,
            unit=item.unit,
            unit_rate=item.unit_rate,
            total_amount=item.total_amount
        )
        db.add(db_item)
    new_req.estimated_budget = boq_calc.total_estimated_cost_inr
    db.commit()
    db.refresh(new_req)

    return new_req

@router.get("/requests")
def get_construction_requests(db: Session = Depends(get_db)):
    reqs = db.query(ConstructionRequest).order_by(ConstructionRequest.created_at.desc()).all()
    if not reqs:
        # Seed realistic construction request
        sample = ConstructionRequest(
            title="Pothole Cluster Patch Repair - Ring Road Junction 4",
            road_name="Ring Road Eastbound",
            description="Deep depression causing vehicle tire punctures. Requires 7cm DBM overlay and joint tacking.",
            status="In Progress",
            priority="Urgent",
            estimated_budget=84500.0,
            actual_expenditure=79200.0
        )
        db.add(sample)
        db.commit()
        db.refresh(sample)
        # Add sample BOQ
        db.add(BOQItem(request_id=sample.id, item_name="Dense Bituminous Macadam", description="Hot-mix asphalt", quantity=1.8, unit="Metric Ton", unit_rate=5200.0, total_amount=9360.0))
        db.add(BOQItem(request_id=sample.id, item_name="Bitumen Emulsion Tack Coat", description="RS-1 spray", quantity=14.0, unit="Litres", unit_rate=65.0, total_amount=910.0))
        db.commit()
        reqs = [sample]

    results = []
    for r in reqs:
        items = [{"item_name": bi.item_name, "quantity": bi.quantity, "unit": bi.unit, "total_amount": bi.total_amount} for bi in r.boq_items]
        results.append({
            "id": r.id,
            "title": r.title,
            "road_name": r.road_name,
            "description": r.description,
            "status": r.status,
            "priority": r.priority,
            "estimated_budget": r.estimated_budget,
            "actual_expenditure": r.actual_expenditure,
            "created_at": r.created_at,
            "boq_items": items,
            "quotations_count": len(r.quotations)
        })
    return results

@router.patch("/projects/{req_id}/status")
def update_project_status(req_id: int, status: str = Body(..., embed=True), db: Session = Depends(get_db)):
    valid_statuses = [
        "New", "Pending Verification", "Approved", "Open for Quotation",
        "Contractor Assigned", "In Progress", "Quality Inspection", "Completed", "Rejected"
    ]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    req = db.query(ConstructionRequest).filter(ConstructionRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Construction request not found")

    req.status = status
    db.commit()
    return {"message": f"Status updated to '{status}'", "id": req_id, "status": status}

@router.post("/quotations", response_model=QuotationResponse)
def submit_quotation(
    q: QuotationCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    uid = current_user.id if current_user else 1
    new_quote = ContractorQuotation(
        request_id=q.request_id,
        contractor_id=uid,
        company_name=q.company_name,
        quotation_amount=q.quotation_amount,
        timeline_days=q.timeline_days,
        remarks=q.remarks,
        status="Submitted"
    )
    db.add(new_quote)
    db.commit()
    db.refresh(new_quote)
    return new_quote

@router.post("/repairs/verify", response_model=RepairQualityVerifyResponse)
async def verify_road_repair(
    request_id: int = Form(...),
    original_file: UploadFile = File(...),
    completed_file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    AI-Assisted Before-and-After Road Repair Quality Module:
    Compares original damaged road image with completed road photograph.
    Computes visible repair coverage %, residual defects, quality score, and engineering status.
    """
    orig_bytes = await original_file.read()
    comp_bytes = await completed_file.read()

    orig_arr = np.frombuffer(orig_bytes, np.uint8)
    comp_arr = np.frombuffer(comp_bytes, np.uint8)

    img_before = cv2.imdecode(orig_arr, cv2.IMREAD_COLOR)
    img_after = cv2.imdecode(comp_arr, cv2.IMREAD_COLOR)

    if img_before is None or img_after is None:
        raise HTTPException(status_code=400, detail="Unable to decode one or both inspection images")

    # Save images to disk
    t = int(time.time())
    orig_name = f"repair_orig_{request_id}_{t}.jpg"
    comp_name = f"repair_comp_{request_id}_{t}.jpg"
    cv2.imwrite(os.path.join(settings.UPLOAD_DIR, orig_name), img_before)
    cv2.imwrite(os.path.join(settings.UPLOAD_DIR, comp_name), img_after)

    verification = verify_repair_quality(img_before, img_after)
    verification.original_img_url = f"/uploads/{orig_name}"
    verification.completed_img_url = f"/uploads/{comp_name}"

    # Log into database
    inspection_record = RepairQualityInspection(
        request_id=request_id,
        original_img_url=verification.original_img_url,
        completed_img_url=verification.completed_img_url,
        repair_coverage_pct=verification.repair_coverage_pct,
        residual_defects_found=verification.residual_defects_found,
        quality_score=verification.quality_score,
        engineer_comment=verification.assessment_notes,
        approved=(verification.quality_score >= 80.0)
    )
    db.add(inspection_record)
    db.commit()

    return verification


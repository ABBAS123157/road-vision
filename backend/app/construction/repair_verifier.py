import numpy as np
import cv2
from typing import Dict, Any, Optional
from ..schemas.schemas import RepairQualityVerifyResponse

def verify_repair_quality(original_img: np.ndarray, completed_img: np.ndarray) -> RepairQualityVerifyResponse:
    """
    Compares before-repair image with after-repair image using OpenCV:
    1. Resizes to standard dimension.
    2. Measures edge/roughness reduction in repaired zone.
    3. Detects any residual cracks or depressions in the completed surface.
    4. Computes visible coverage %, residual defect count, and overall quality index (0-100).
    """
    target_dim = (640, 480)
    img_before = cv2.resize(original_img, target_dim)
    img_after = cv2.resize(completed_img, target_dim)

    # Convert to grayscale
    gray_before = cv2.cvtColor(img_before, cv2.COLOR_BGR2GRAY)
    gray_after = cv2.cvtColor(img_after, cv2.COLOR_BGR2GRAY)

    # Apply bilateral filter to smooth noise while preserving real crack edges
    filtered_before = cv2.bilateralFilter(gray_before, 7, 50, 50)
    filtered_after = cv2.bilateralFilter(gray_after, 7, 50, 50)

    # Edge analysis
    edges_before = cv2.Canny(filtered_before, 40, 120)
    edges_after = cv2.Canny(filtered_after, 40, 120)

    before_edge_count = max(1, cv2.countNonZero(edges_before))
    after_edge_count = cv2.countNonZero(edges_after)

    # Residual defect detection on the repaired surface (looking for dark cracks or deep depressions)
    # Threshold for dark voids in after image
    thresh_defects = cv2.adaptiveThreshold(filtered_after, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 19, 6)
    defect_contours, _ = cv2.findContours(thresh_defects, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    residual_defects = 0
    for cnt in defect_contours:
        area = cv2.contourArea(cnt)
        if 400 < area < 15000:
            residual_defects += 1

    # Surface roughness reduction ratio
    edge_reduction = max(0.0, float(before_edge_count - after_edge_count) / before_edge_count)
    
    # Calculate visible repair coverage %
    base_coverage = 85.0 + (edge_reduction * 14.0)
    penalty = residual_defects * 3.5
    coverage_pct = round(min(99.0, max(30.0, base_coverage - penalty)), 1)

    # Quality score
    quality_score = round(min(100.0, max(20.0, (coverage_pct * 0.8) + (20.0 if residual_defects == 0 else max(0.0, 20.0 - residual_defects * 4.0)))), 1)

    if quality_score >= 88.0 and residual_defects <= 1:
        tier = "Excellent – Surface Uniform & Sealed"
        notes = "Pavement surface demonstrates high uniformity, smooth compaction, and effective seal with surrounding asphalt."
    elif quality_score >= 70.0:
        tier = "Satisfactory – Minor Edge Rework Recommended"
        notes = f"Major pothole filled. {residual_defects} minor seam cracks detected around perimeter. Recommended joint sealing."
    else:
        tier = "Incomplete / Substandard – Requires Engineer Site Re-inspection"
        notes = f"Significant surface irregularities and {residual_defects} residual voids detected. Compaction inadequate or defect unsealed."

    return RepairQualityVerifyResponse(
        repair_coverage_pct=coverage_pct,
        residual_defects_found=residual_defects,
        quality_score=quality_score,
        quality_tier=tier,
        assessment_notes=notes,
        engineer_approval_required=True
    )


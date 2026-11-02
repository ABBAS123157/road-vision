import sys, os
sys.path.insert(0, os.path.abspath("."))

import numpy as np
from backend.app.main import app
from backend.app.construction.boq_engine import calculate_preliminary_boq
from backend.app.schemas.schemas import BOQCalculationRequest
from backend.app.safety.hazard_engine import haversine_distance, is_hazard_ahead
from backend.app.safety.risk_scoring import calculate_road_risk_score
from backend.app.ai.detector import global_detector

def test_boq_calculation():
    req = BOQCalculationRequest(
        damage_type="Pothole",
        length_m=2.0,
        width_m=1.0,
        depth_cm=6.0,
        layer_thickness_cm=5.0,
        waste_factor_pct=10.0
    )
    res = calculate_preliminary_boq(req)
    assert res.surface_area_sqm == 2.0
    assert res.volume_cum == 0.12
    assert res.asphalt_metric_tons > 0
    assert res.total_estimated_cost_inr > 0
    assert len(res.items) == 6

def test_haversine_distance():
    # Delhi to Gurgaon approx 30 km
    d = haversine_distance(28.6139, 77.2090, 28.4595, 77.0266)
    assert 20000 < d < 40000

def test_is_hazard_ahead():
    # User at 0,0 heading 0 (North). Hazard at 0.01, 0 is directly North (ahead)
    assert is_hazard_ahead(0.0, 0.0, 0.0, 0.01, 0.0) is True
    # Hazard at -0.01, 0 is directly South (behind)
    assert is_hazard_ahead(0.0, 0.0, 0.0, -0.01, 0.0) is False

def test_road_risk_score():
    score = calculate_road_risk_score(
        potholes_count=3,
        cracks_count=2,
        traffic_density="High",
        is_waterlogged=True
    )
    assert score["risk_score"] > 60.0
    assert "Risk" in score["risk_category"]

def test_detector_inference():
    # Run test on 320x320 synthetic frame
    dummy_frame = np.zeros((320, 320, 3), dtype=np.uint8)
    dets, annotated = global_detector.detect_frame(dummy_frame)
    assert isinstance(dets, list)
    assert annotated.shape == dummy_frame.shape

if __name__ == "__main__":
    test_boq_calculation()
    test_haversine_distance()
    test_is_hazard_ahead()
    test_road_risk_score()
    test_detector_inference()
    print("ALL TESTS PASSED SUCCESSFULLY!")

from typing import Dict, Any, List

def calculate_road_risk_score(
    potholes_count: int = 0,
    cracks_count: int = 0,
    traffic_density: str = "Low", # Low, Medium, High, Severe
    pedestrians_count: int = 0,
    is_waterlogged: bool = False,
    is_raining: bool = False,
    avg_speed_kmh: float = 40.0,
    historical_incidents: int = 0
) -> Dict[str, Any]:
    """
    Computes a comprehensive road safety advisory risk score (0 to 100).
    """
    score = 15.0 # Base nominal risk
    factors = []

    # Road damage factor (max +35)
    damage_score = min(35.0, (potholes_count * 12.0) + (cracks_count * 5.0))
    score += damage_score
    if potholes_count > 0:
        factors.append(f"{potholes_count} potholes detected affecting tire traction and vehicle stability")
    if cracks_count > 0:
        factors.append(f"{cracks_count} active surface cracks indicating structural degradation")

    # Waterlogging & Rain factor (max +25)
    if is_waterlogged:
        score += 20.0
        factors.append("Active standing water / waterlogging detected (hydroplaning risk)")
    if is_raining:
        score += 8.0
        factors.append("Wet pavement conditions reducing braking coefficient")

    # Traffic Density (max +20)
    density_map = {"Low": 2.0, "Medium": 8.0, "High": 16.0, "Severe": 22.0}
    density_score = density_map.get(traffic_density, 5.0)
    score += density_score
    if traffic_density in ["High", "Severe"]:
        factors.append(f"{traffic_density} traffic congestion increasing collision exposure")

    # Pedestrian Activity (max +15)
    if pedestrians_count > 0:
        ped_score = min(15.0, pedestrians_count * 5.0)
        score += ped_score
        factors.append(f"{pedestrians_count} pedestrians/workers in roadway environment")

    # Speed factor
    if avg_speed_kmh > 70.0 and (potholes_count > 0 or is_waterlogged):
        score += 10.0
        factors.append(f"Elevated vehicle speed ({avg_speed_kmh} km/h) despite hazardous road conditions")

    # Cap between 0 and 100
    final_score = min(100.0, max(0.0, round(score, 1)))

    if final_score >= 75.0:
        category = "Critical / Severe Risk"
        recommendations = [
            "Reduce travel speed to below 25 km/h immediately.",
            "Dispatch emergency municipal repair team for pothole patching.",
            "Engage road drainage pumps to clear localized ponding."
        ]
    elif final_score >= 50.0:
        category = "High Risk"
        recommendations = [
            "Advisory speed reduction to 40 km/h.",
            "Schedule prioritized maintenance inspection within 48 hours.",
            "Increase safe following distance to at least 3 car lengths."
        ]
    elif final_score >= 30.0:
        category = "Moderate Risk"
        recommendations = [
            "Maintain standard defensive driving precautions.",
            "Log damage in routine preventive maintenance ledger."
        ]
    else:
        category = "Low Risk"
        recommendations = [
            "Normal driving conditions. Surface within acceptable safety tolerances."
        ]

    return {
        "risk_score": final_score,
        "risk_category": category,
        "contributing_factors": factors,
        "recommendations": recommendations,
        "human_review_required": final_score >= 60.0
    }


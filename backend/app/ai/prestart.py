from typing import List, Dict, Any, Tuple

def evaluate_prestart_safety(detections: List[Dict[str, Any]], frame_shape: Tuple[int, int] = (480, 640)) -> Dict[str, Any]:
    """
    Evaluates vehicle surroundings before starting motion:
    Returns:
    - status: "SAFE TO PROCEED" | "CAUTION" | "STOP – DANGER DETECTED"
    - reasons: list of advisory bullet points
    - nearby_pedestrians, nearby_vehicles, nearby_hazards
    - action_recommendation: text suitable for voice announcement / TTS
    """
    h, w = frame_shape
    danger_zone_y = h * 0.72 # Objects with bottom edge below 72% are in vehicle direct vicinity
    caution_zone_y = h * 0.45

    reasons: List[str] = []
    nearby_pedestrians = 0
    nearby_vehicles = 0
    nearby_hazards = 0
    is_danger = False
    is_caution = False

    for det in detections:
        box = det.get("box", [0, 0, 0, 0])
        y2 = box[3]
        cat = det.get("category", "")
        label = det.get("label", "")

        # Check pedestrians
        if cat == "Pedestrian":
            if y2 > danger_zone_y:
                nearby_pedestrians += 1
                is_danger = True
                reasons.append(f"CRITICAL: {label} detected directly in front of vehicle!")
            elif y2 > caution_zone_y:
                nearby_pedestrians += 1
                is_caution = True
                reasons.append(f"Caution: Pedestrian in nearby roadway corridor.")

        # Check vehicles & motorcycles
        elif cat == "Vehicle":
            if y2 > danger_zone_y:
                nearby_vehicles += 1
                is_danger = True
                reasons.append(f"CRITICAL: {label} obstructing immediate travel path!")
            elif y2 > caution_zone_y:
                nearby_vehicles += 1
                is_caution = True
                reasons.append(f"Notice: {label} active within 15 meters.")

        # Check road hazards & debris
        elif cat == "Road Damage":
            if y2 > danger_zone_y:
                nearby_hazards += 1
                is_danger = True
                reasons.append(f"DANGER: Severe {label} right ahead at vehicle bumper level!")
            elif y2 > caution_zone_y:
                nearby_hazards += 1
                is_caution = True
                reasons.append(f"Caution: {label} detected on road surface ahead.")

        # Emergency vehicle nearby
        elif cat == "Emergency Vehicle":
            is_caution = True
            reasons.append(f"Emergency Priority: {label} active in area. Prepare to yield.")

    # Determine final status
    if is_danger:
        status = "STOP – DANGER DETECTED"
        recommendation = "Do not accelerate. Hazard or pedestrian directly in blind spot or immediate path."
    elif is_caution:
        status = "CAUTION"
        recommendation = "Proceed with caution at low speed. Monitor surrounding traffic and pedestrians."
    else:
        status = "SAFE TO PROCEED"
        recommendation = "Surroundings clear. Safe to proceed with normal defensive driving."
        reasons.append("Forward road area clear of immediate obstacles and pedestrians.")

    return {
        "status": status,
        "reasons": reasons,
        "nearby_pedestrians": nearby_pedestrians,
        "nearby_vehicles": nearby_vehicles,
        "nearby_hazards": nearby_hazards,
        "action_recommendation": recommendation
    }


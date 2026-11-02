import math
from typing import List, Dict, Any, Optional

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Returns great-circle distance between two GPS coordinates in meters.
    """
    R = 6371000.0 # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates initial compass bearing (0-360 degrees) from point 1 to point 2.
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_lambda = math.radians(lon2 - lon1)

    y = math.sin(delta_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)
    bearing = math.degrees(math.atan2(y, x))
    return (bearing + 360.0) % 360.0

def is_hazard_ahead(user_lat: float, user_lon: float, user_heading: float, hazard_lat: float, hazard_lon: float) -> bool:
    """
    Checks if hazard is ahead along current vehicle heading:
    If angle difference is <= 70 degrees, hazard is in front of the vehicle.
    If angle difference is > 90 degrees, hazard is BEHIND the vehicle.
    """
    bearing_to_hazard = calculate_bearing(user_lat, user_lon, hazard_lat, hazard_lon)
    angle_diff = abs(user_heading - bearing_to_hazard)
    if angle_diff > 180.0:
        angle_diff = 360.0 - angle_diff
    return angle_diff <= 75.0

class HazardNotificationEngine:
    def __init__(self):
        # Cache of recently alerted hazards per user session to avoid duplicate spamming
        self.alert_history: Dict[str, Dict[int, str]] = {} # session_key -> {hazard_id: last_stage_alerted}

    def evaluate_hazards(self, user_id: str, user_lat: float, user_lon: float, user_heading: float, hazards: List[Any]) -> List[Dict[str, Any]]:
        """
        Filters hazards based on:
        1. Must be in front of the user (direction check).
        2. Within 1000m range.
        3. Classifies advance stages: "1km", "500m", "200m", "immediate (<50m)".
        4. Suppresses duplicates if user hasn't crossed into a new proximity threshold.
        """
        if user_id not in self.alert_history:
            self.alert_history[user_id] = {}

        active_alerts: List[Dict[str, Any]] = []

        for h in hazards:
            h_lat = h.latitude
            h_lon = h.longitude
            dist = haversine_distance(user_lat, user_lon, h_lat, h_lon)

            # Ignore hazards beyond 1100m
            if dist > 1100.0:
                continue

            # Direction check: ensure hazard is ahead
            if user_heading >= 0 and not is_hazard_ahead(user_lat, user_lon, user_heading, h_lat, h_lon):
                # Hazard is behind or perpendicular; do not distract driver
                continue

            # Determine notification stage
            stage = None
            if dist <= 50.0:
                stage = "immediate"
                guidance = f"CRITICAL: {h.hazard_type} immediately ahead ({int(dist)}m)! Slow down to < 20 km/h."
            elif dist <= 250.0:
                stage = "200m"
                guidance = f"CAUTION: {h.hazard_type} in {int(dist)}m. Brake gently and hold your lane."
            elif dist <= 600.0:
                stage = "500m"
                guidance = f"ALERT: {h.hazard_type} reported 500m ahead on your route. Reduce speed."
            elif dist <= 1100.0:
                stage = "1km"
                guidance = f"ADVANCE NOTICE: {h.hazard_type} detected ~1 km ahead. Maintain safe following distance."

            if stage is not None:
                last_stage = self.alert_history[user_id].get(h.id)
                # Only alert if new stage reached
                is_new_alert = (last_stage != stage)
                if is_new_alert:
                    self.alert_history[user_id][h.id] = stage

                active_alerts.append({
                    "id": h.id,
                    "hazard_type": h.hazard_type,
                    "severity": h.severity,
                    "description": h.description or f"Verified {h.hazard_type} on road segment",
                    "latitude": h.latitude,
                    "longitude": h.longitude,
                    "distance_meters": round(dist, 1),
                    "advance_stage": stage,
                    "is_new_trigger": is_new_alert,
                    "driving_guidance": guidance,
                    "image_url": getattr(h, 'image_url', None)
                })

        # Sort by closest distance
        active_alerts.sort(key=lambda x: x["distance_meters"])
        return active_alerts

hazard_engine = HazardNotificationEngine()


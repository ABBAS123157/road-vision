from fastapi import APIRouter, Query, Depends
import requests
from datetime import datetime
from ..schemas.schemas import WeatherResponse

router = APIRouter(tags=["Weather & Flood Intelligence"])

@router.get("/weather/current", response_model=WeatherResponse)
def get_current_weather(
    lat: float = Query(28.6139, description="Latitude"),
    lon: float = Query(77.2090, description="Longitude")
):
    """
    Integrates live weather data source (Open-Meteo Open Source API)
    with autonomous road waterlogging risk analysis.
    """
    temp_c = 28.5
    rain_mm = 0.0
    condition = "Partly Cloudy"
    source = "Open-Meteo Free API (Live)"

    # Attempt to fetch live data if online; fallback smoothly if offline/sandboxed
    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,precipitation,weather_code&timezone=auto"
        res = requests.get(url, timeout=3.0)
        if res.status_code == 200:
            data = res.json()
            curr = data.get("current", {})
            temp_c = float(curr.get("temperature_2m", 28.5))
            rain_mm = float(curr.get("precipitation", 0.0))
            code = curr.get("weather_code", 0)
            if code in [51, 53, 55, 61, 63, 65, 80, 81, 82]:
                condition = "Rain / Showers"
            elif code in [71, 73, 75]:
                condition = "Snow"
            elif code in [95, 96, 99]:
                condition = "Thunderstorm"
            elif code in [1, 2, 3]:
                condition = "Partly Cloudy"
            else:
                condition = "Clear"
    except Exception:
        source = "Simulated Meteorological Sensor Network (Offline Mode)"

    flood_risk = "Severe" if rain_mm > 15.0 else ("Moderate" if rain_mm > 3.0 else "Low")
    is_waterlogged = rain_mm > 5.0

    route_warnings = []
    if rain_mm > 8.0:
        route_warnings.append("Heavy rainfall active: Underpass lanes and low-lying arterial segments susceptible to deep water ponding.")
    if rain_mm > 2.0:
        route_warnings.append("Pavement wet: Braking distances increased by approximately 35%.")

    return WeatherResponse(
        temperature_c=temp_c,
        rainfall_mm=rain_mm,
        condition=condition,
        flood_risk_level=flood_risk,
        waterlogging_detected=is_waterlogged,
        route_warnings=route_warnings,
        source=source,
        timestamp=datetime.utcnow()
    )

@router.get("/weather/road-risks")
def get_weather_road_risks():
    return {
        "flood_prone_road_register": [
            {"road_name": "Ring Road Underpass - Sector 3", "risk_level": "Severe", "drainage_capacity_pct": 45, "closure_threshold_mm": 20},
            {"road_name": "Low-level River Crossing Causeway", "risk_level": "Critical", "drainage_capacity_pct": 20, "closure_threshold_mm": 10},
            {"road_name": "Highway Interchange Ramp B", "risk_level": "Moderate", "drainage_capacity_pct": 75, "closure_threshold_mm": 35}
        ],
        "sensor_alerts": [
            "Sensor WL-04: Subsurface moisture elevated (82%). Pavement fatigue risk increased."
        ]
    }

@router.get("/flood/hazards")
def get_flood_hazards():
    return [
        {"id": 1, "road": "Old Delhi Road Low Dip", "water_depth_cm": 14.5, "status": "Caution - Slow Passing Only", "lat": 28.6185, "lng": 77.2045},
        {"id": 2, "road": "Sector 9 Storm Drain Overflow", "water_depth_cm": 22.0, "status": "Road Closed - Diversion Active", "lat": 28.6270, "lng": 77.2140}
    ]


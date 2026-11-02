from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

# --- Auth & User Schemas ---
class UserBase(BaseModel):
    email: str
    full_name: str
    role: str = "Road Inspector"
    phone: Optional[str] = None
    emergency_contact: Optional[str] = None
    consent_location_tracking: bool = True

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[str] = None

# --- Damage & Inspection Schemas ---
class DamageRecordCreate(BaseModel):
    damage_type: str
    severity: str = "Medium"
    confidence: float = 0.85
    estimated_length_m: float = 1.0
    estimated_width_m: float = 0.8
    estimated_area_sqm: float = 0.8
    estimated_depth_cm: float = 5.0
    image_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    inspection_id: Optional[int] = None

class DamageRecordResponse(DamageRecordCreate):
    id: int
    verified_by_engineer: bool
    verification_notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class InspectionCreate(BaseModel):
    title: str
    road_name: str
    latitude: float
    longitude: float
    road_type: str = "City Road"
    weather_condition: str = "Clear"
    notes: Optional[str] = None

class InspectionResponse(InspectionCreate):
    id: int
    user_id: Optional[int] = None
    status: str
    created_at: datetime
    damages: List[DamageRecordResponse] = []

    class Config:
        from_attributes = True

# --- AI Detection & Tracking Schemas ---
class DetectionItem(BaseModel):
    category: str # Vehicle, Pedestrian, Road Damage, Safety Gear, Emergency Vehicle
    label: str
    confidence: float
    tracking_id: Optional[int] = None
    box: List[float] # [x1, y1, x2, y2]
    speed_kmh: Optional[float] = None
    danger_level: Optional[str] = "Safe"
    is_wrong_way: Optional[bool] = False
    attributes: Optional[Dict[str, Any]] = None

class LiveDetectionResponse(BaseModel):
    fps: float
    processing_time_ms: float
    total_detected: int
    vehicles_count: int
    pedestrians_count: int
    hazards_count: int
    potholes_count: int
    emergency_count: int
    detections: List[DetectionItem]
    prestart_advisory: str # "SAFE TO PROCEED" | "CAUTION" | "STOP – DANGER DETECTED"
    status: str
    timestamp: str

class PrestartCheckRequest(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    image_base64: Optional[str] = None

class PrestartCheckResponse(BaseModel):
    status: str # SAFE TO PROCEED, CAUTION, STOP – DANGER DETECTED
    reasons: List[str]
    nearby_pedestrians: int
    nearby_vehicles: int
    nearby_hazards: int
    action_recommendation: str

# --- Navigation, Hazard & Speed Schemas ---
class GPSLocationCreate(BaseModel):
    latitude: float
    longitude: float
    speed_kmh: float = 0.0
    heading: float = 0.0
    accuracy: float = 5.0

class GPSLocationResponse(GPSLocationCreate):
    id: int
    user_id: Optional[int] = None
    timestamp: datetime

    class Config:
        from_attributes = True

class HazardAlertItem(BaseModel):
    id: int
    hazard_type: str
    severity: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    distance_meters: float
    advance_stage: Optional[str] = None # "1km", "500m", "200m", "immediate"
    driving_guidance: str
    image_url: Optional[str] = None

class SpeedAdvisoryResponse(BaseModel):
    current_gps_speed: float
    legal_speed_limit: float
    ai_advisory_speed: float
    road_classification: str
    is_overspeed: bool
    warning: Optional[str] = None
    hazard_slowdown_notice: Optional[str] = None

# --- Construction & BOQ Schemas ---
class BOQCalculationRequest(BaseModel):
    damage_type: str = "Pothole"
    length_m: float = 2.0
    width_m: float = 1.5
    depth_cm: float = 6.0
    layer_thickness_cm: float = 5.0
    waste_factor_pct: float = 10.0
    asphalt_rate_per_ton: float = 5200.0 # INR
    bitumen_rate_per_ltr: float = 65.0 # INR
    aggregate_rate_per_ton: float = 1200.0 # INR
    labour_daily_rate: float = 750.0 # INR
    equipment_rate_per_hr: float = 1800.0 # INR
    transport_rate_per_trip: float = 2500.0 # INR

class BOQItemDetail(BaseModel):
    item_name: str
    description: str
    quantity: float
    unit: str
    unit_rate: float
    total_amount: float

class BOQCalculationResponse(BaseModel):
    surface_area_sqm: float
    volume_cum: float
    asphalt_metric_tons: float
    bitumen_liters: float
    aggregate_metric_tons: float
    labour_days: float
    equipment_hours: float
    transport_trips: int
    total_estimated_cost_inr: float
    recommended_repair: str
    items: List[BOQItemDetail]
    disclaimer: str

class ConstructionRequestCreate(BaseModel):
    title: str
    road_name: str
    damage_id: Optional[int] = None
    description: Optional[str] = None
    priority: str = "High"
    estimated_budget: float = 0.0

class ConstructionRequestResponse(ConstructionRequestCreate):
    id: int
    status: str
    actual_expenditure: float
    created_at: datetime
    updated_at: Optional[datetime] = None
    boq_items: List[Dict[str, Any]] = []

    class Config:
        from_attributes = True

class QuotationCreate(BaseModel):
    request_id: int
    company_name: str
    quotation_amount: float
    timeline_days: int = 7
    remarks: Optional[str] = None

class QuotationResponse(QuotationCreate):
    id: int
    contractor_id: int
    status: str
    submitted_at: datetime

    class Config:
        from_attributes = True

class RepairQualityVerifyResponse(BaseModel):
    repair_coverage_pct: float
    residual_defects_found: int
    quality_score: float # 0 to 100
    quality_tier: str # Excellent, Satisfactory, Incomplete / Rework Needed
    assessment_notes: str
    engineer_approval_required: bool = True
    original_img_url: Optional[str] = None
    completed_img_url: Optional[str] = None

# --- Maintenance Priority Schemas ---
class MaintenancePriorityResponse(BaseModel):
    id: int
    road_segment: str
    damage_severity_score: float
    traffic_volume_score: float
    pedestrian_risk_score: float
    flood_risk_score: float
    emergency_importance_score: float
    total_priority_score: float
    rank: int
    risk_category: str
    recommended_repair: str
    estimated_budget: float
    engineer_verified: bool
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Weather Schemas ---
class WeatherResponse(BaseModel):
    temperature_c: float
    rainfall_mm: float
    condition: str
    flood_risk_level: str
    waterlogging_detected: bool
    route_warnings: List[str]
    source: str
    timestamp: datetime

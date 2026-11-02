from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Enum, Index
)
from sqlalchemy.orm import relationship
from ..core.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="Road Inspector", nullable=False) # Administrator, Driver, Road Inspector, Safety Officer, Civil Engineer, Construction Company, Contractor
    phone = Column(String(50), nullable=True)
    emergency_contact = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    consent_location_tracking = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)

    inspections = relationship("Inspection", back_populates="inspector")
    gps_locations = relationship("GPSLocation", back_populates="user")
    detection_events = relationship("AIDetectionEvent", back_populates="user")

class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String(255), nullable=False)
    road_name = Column(String(255), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    status = Column(String(50), default="Completed") # In Progress, Completed, Verified
    road_type = Column(String(50), default="City Road") # Highway, City Road, Residential, Rural
    weather_condition = Column(String(50), default="Clear")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, index=True)

    inspector = relationship("User", back_populates="inspections")
    damages = relationship("DamageRecord", back_populates="inspection", cascade="all, delete-orphan")

class DamageRecord(Base):
    __tablename__ = "damage_records"

    id = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id"), nullable=True)
    damage_type = Column(String(100), nullable=False, index=True) # Pothole, Longitudinal Crack, Transverse Crack, Alligator Crack, Waterlogging, Open Manhole, Debris, etc.
    severity = Column(String(50), default="Medium") # Low, Medium, High, Critical
    confidence = Column(Float, default=0.85)
    estimated_length_m = Column(Float, default=1.0)
    estimated_width_m = Column(Float, default=0.8)
    estimated_area_sqm = Column(Float, default=0.8)
    estimated_depth_cm = Column(Float, default=5.0)
    image_url = Column(String(500), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    verified_by_engineer = Column(Boolean, default=False)
    verification_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, index=True)

    inspection = relationship("Inspection", back_populates="damages")
    construction_requests = relationship("ConstructionRequest", back_populates="damage")

class AIDetectionEvent(Base):
    __tablename__ = "ai_detection_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    object_category = Column(String(50), index=True) # Vehicle, Pedestrian, Road Damage, Safety Gear, Emergency Vehicle
    label = Column(String(100), nullable=False, index=True)
    confidence = Column(Float, nullable=False)
    tracking_id = Column(Integer, nullable=True, index=True)
    bbox_x1 = Column(Float, nullable=True)
    bbox_y1 = Column(Float, nullable=True)
    bbox_x2 = Column(Float, nullable=True)
    bbox_y2 = Column(Float, nullable=True)
    speed_kmh = Column(Float, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    image_url = Column(String(500), nullable=True)
    source_type = Column(String(50), default="Live Camera") # Live Camera, Image Upload, Video Upload
    created_at = Column(DateTime, default=utcnow, index=True)

    user = relationship("User", back_populates="detection_events")

class VehicleTrackingEvent(Base):
    __tablename__ = "vehicle_tracking_events"

    id = Column(Integer, primary_key=True, index=True)
    tracking_id = Column(Integer, nullable=False, index=True)
    vehicle_type = Column(String(50), nullable=False) # car, bus, truck, motorcycle, bicycle, auto_rickshaw, ambulance, fire_engine
    speed_kmh = Column(Float, default=0.0)
    direction = Column(String(50), default="Forward") # North, South, East, West, Forward, Reverse
    is_wrong_way = Column(Boolean, default=False)
    is_congested = Column(Boolean, default=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=utcnow, index=True)

class PedestrianSafetyEvent(Base):
    __tablename__ = "pedestrian_safety_events"

    id = Column(Integer, primary_key=True, index=True)
    tracking_id = Column(Integer, nullable=True, index=True)
    proximity_danger = Column(String(50), default="Safe") # Safe, Caution, Danger Zone
    crossing_status = Column(Boolean, default=False)
    helmet_detected = Column(Boolean, default=False)
    vest_detected = Column(Boolean, default=False)
    is_worker = Column(Boolean, default=False)
    warning_issued = Column(Boolean, default=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=utcnow, index=True)

class NearMissIncident(Base):
    __tablename__ = "near_miss_incidents"

    id = Column(Integer, primary_key=True, index=True)
    incident_type = Column(String(100), default="Vehicle-Pedestrian Proximity Conflict")
    risk_level = Column(String(50), default="High") # Low, Medium, High, Critical
    vehicle_tracking_id = Column(Integer, nullable=True)
    pedestrian_tracking_id = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    evidence_image_url = Column(String(500), nullable=True)
    timestamp = Column(DateTime, default=utcnow, index=True)

class EmergencyVehicleEvent(Base):
    __tablename__ = "emergency_vehicle_events"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_type = Column(String(50), default="Ambulance") # Ambulance, Fire Engine, Police
    tracking_id = Column(Integer, nullable=True)
    direction = Column(String(50), default="Northbound")
    congestion_delay_min = Column(Float, default=0.0)
    alert_dispatched = Column(Boolean, default=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=utcnow, index=True)

class GPSLocation(Base):
    __tablename__ = "gps_locations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    speed_kmh = Column(Float, default=0.0)
    heading = Column(Float, default=0.0)
    accuracy = Column(Float, default=5.0)
    timestamp = Column(DateTime, default=utcnow, index=True)

    user = relationship("User", back_populates="gps_locations")

class HazardAlert(Base):
    __tablename__ = "hazard_alerts"

    id = Column(Integer, primary_key=True, index=True)
    hazard_type = Column(String(100), nullable=False, index=True) # Pothole, Flooding, Debris, Accident, Roadwork
    severity = Column(String(50), default="High") # Low, Medium, High, Critical
    description = Column(Text, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    road_segment = Column(String(255), default="Main Corridor")
    image_url = Column(String(500), nullable=True)
    status = Column(String(50), default="Active") # Active, Resolved, Under Repair
    verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow, index=True)

class SpeedObservation(Base):
    __tablename__ = "speed_observations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    gps_speed_kmh = Column(Float, nullable=False)
    legal_limit_kmh = Column(Float, default=60.0)
    ai_advisory_kmh = Column(Float, default=50.0)
    road_category = Column(String(50), default="City Road") # City, Highway, Residential, Rural
    is_overspeed = Column(Boolean, default=False)
    hazard_slowdown_reason = Column(String(255), nullable=True)
    timestamp = Column(DateTime, default=utcnow, index=True)

class WeatherObservation(Base):
    __tablename__ = "weather_observations"

    id = Column(Integer, primary_key=True, index=True)
    temperature_c = Column(Float, default=28.0)
    rainfall_mm = Column(Float, default=0.0)
    condition = Column(String(100), default="Partly Cloudy")
    flood_risk_level = Column(String(50), default="Low") # Low, Moderate, Severe
    waterlogging_detected = Column(Boolean, default=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    source = Column(String(50), default="Open-Meteo & AI Camera")
    timestamp = Column(DateTime, default=utcnow, index=True)

class TrafficCongestionRecord(Base):
    __tablename__ = "traffic_congestion_records"

    id = Column(Integer, primary_key=True, index=True)
    road_segment = Column(String(255), nullable=False, index=True)
    vehicle_count = Column(Integer, default=0)
    density_level = Column(String(50), default="Low") # Low, Medium, High, Severe
    queue_length_m = Column(Float, default=0.0)
    avg_speed_kmh = Column(Float, default=45.0)
    timestamp = Column(DateTime, default=utcnow, index=True)

class ConstructionRequest(Base):
    __tablename__ = "construction_requests"

    id = Column(Integer, primary_key=True, index=True)
    damage_id = Column(Integer, ForeignKey("damage_records.id"), nullable=True)
    title = Column(String(255), nullable=False)
    road_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="New", index=True) # New, Pending Verification, Approved, Open for Quotation, Contractor Assigned, In Progress, Quality Inspection, Completed, Rejected
    priority = Column(String(50), default="High") # Low, Medium, High, Urgent
    estimated_budget = Column(Float, default=0.0) # INR
    actual_expenditure = Column(Float, default=0.0) # INR
    engineer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    contractor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=utcnow, index=True)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    damage = relationship("DamageRecord", back_populates="construction_requests")
    boq_items = relationship("BOQItem", back_populates="request", cascade="all, delete-orphan")
    quotations = relationship("ContractorQuotation", back_populates="request", cascade="all, delete-orphan")
    quality_inspections = relationship("RepairQualityInspection", back_populates="request")

class BOQItem(Base):
    __tablename__ = "boq_items"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("construction_requests.id"), nullable=False)
    item_name = Column(String(255), nullable=False) # Asphalt Dense Bituminous Macadam, Bitumen Tack Coat, Aggregate Base, Labour, Compactor/Roller, Transport
    description = Column(Text, nullable=True)
    quantity = Column(Float, default=1.0)
    unit = Column(String(50), default="Metric Ton") # Metric Ton, Sqm, Cum, Litres, Hours, Days
    unit_rate = Column(Float, default=1000.0) # INR
    total_amount = Column(Float, default=1000.0) # INR

    request = relationship("ConstructionRequest", back_populates="boq_items")

class ContractorQuotation(Base):
    __tablename__ = "contractor_quotations"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("construction_requests.id"), nullable=False)
    contractor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    company_name = Column(String(255), nullable=False)
    quotation_amount = Column(Float, nullable=False) # INR
    timeline_days = Column(Integer, default=7)
    remarks = Column(Text, nullable=True)
    status = Column(String(50), default="Submitted") # Submitted, Accepted, Rejected, Under Review
    submitted_at = Column(DateTime, default=utcnow)

    request = relationship("ConstructionRequest", back_populates="quotations")

class RepairQualityInspection(Base):
    __tablename__ = "repair_quality_inspections"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("construction_requests.id"), nullable=False)
    original_img_url = Column(String(500), nullable=True)
    repair_stage_img_url = Column(String(500), nullable=True)
    completed_img_url = Column(String(500), nullable=True)
    repair_coverage_pct = Column(Float, default=95.0)
    residual_defects_found = Column(Integer, default=0)
    quality_score = Column(Float, default=92.0) # 0 to 100
    engineer_comment = Column(Text, nullable=True)
    approved = Column(Boolean, default=False)
    inspected_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    inspected_at = Column(DateTime, default=utcnow)

    request = relationship("ConstructionRequest", back_populates="quality_inspections")

class MaintenancePriority(Base):
    __tablename__ = "maintenance_priorities"

    id = Column(Integer, primary_key=True, index=True)
    road_segment = Column(String(255), nullable=False, unique=True, index=True)
    damage_severity_score = Column(Float, default=80.0) # 0-100
    traffic_volume_score = Column(Float, default=75.0) # 0-100
    pedestrian_risk_score = Column(Float, default=60.0) # 0-100
    flood_risk_score = Column(Float, default=40.0) # 0-100
    emergency_importance_score = Column(Float, default=70.0) # 0-100
    total_priority_score = Column(Float, default=73.5, index=True)
    rank = Column(Integer, default=1)
    risk_category = Column(String(50), default="High") # Low, Medium, High, Critical
    recommended_repair = Column(String(255), default="Deep patch repair & surface reseal")
    estimated_budget = Column(Float, default=125000.0) # INR
    engineer_verified = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    action = Column(String(100), nullable=False) # Inspection Created, Repair Approved, etc.
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=utcnow, index=True)


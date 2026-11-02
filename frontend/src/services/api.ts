const API_BASE = '/api';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  phone?: string;
  emergency_contact?: string;
}

export interface DetectionItem {
  category: string;
  label: string;
  confidence: number;
  tracking_id?: number;
  box: [number, number, number, number];
  speed_kmh?: number;
  danger_level?: string;
  is_wrong_way?: boolean;
  attributes?: Record<string, any>;
}

export interface LiveDetectionResponse {
  fps: number;
  processing_time_ms: number;
  total_detected: number;
  vehicles_count: number;
  pedestrians_count: number;
  hazards_count: number;
  potholes_count: number;
  emergency_count: number;
  detections: DetectionItem[];
  prestart_advisory: string;
  prestart_details?: {
    status: string;
    reasons: string[];
    action_recommendation: string;
  };
  status: string;
  timestamp: string;
}

export interface BOQItem {
  item_name: string;
  description: string;
  quantity: number;
  unit: string;
  unit_rate: number;
  total_amount: number;
}

export interface BOQResponse {
  surface_area_sqm: number;
  volume_cum: number;
  asphalt_metric_tons: number;
  bitumen_liters: number;
  aggregate_metric_tons: number;
  labour_days: number;
  equipment_hours: number;
  transport_trips: number;
  total_estimated_cost_inr: number;
  recommended_repair: string;
  items: BOQItem[];
  disclaimer: string;
}

export interface HazardAlert {
  id: number;
  hazard_type: string;
  severity: string;
  description: string;
  latitude: number;
  longitude: number;
  distance_meters: number;
  advance_stage?: string;
  driving_guidance: string;
  image_url?: string;
}

export interface SpeedAdvisory {
  current_gps_speed: number;
  legal_speed_limit: number;
  ai_advisory_speed: number;
  road_classification: string;
  is_overspeed: boolean;
  warning?: string;
  hazard_slowdown_notice?: string;
}

export interface MaintenancePriority {
  id: number;
  road_segment: string;
  damage_severity_score: number;
  traffic_volume_score: number;
  pedestrian_risk_score: number;
  flood_risk_score: number;
  emergency_importance_score: number;
  total_priority_score: number;
  rank: number;
  risk_category: string;
  recommended_repair: string;
  estimated_budget: number;
  engineer_verified: boolean;
  updated_at: string;
}

export interface WeatherData {
  temperature_c: number;
  rainfall_mm: number;
  condition: string;
  flood_risk_level: string;
  waterlogging_detected: boolean;
  route_warnings: string[];
  source: string;
  timestamp: string;
}

// API methods
export const api = {
  // Auth
  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error('Authentication failed');
    return res.json();
  },

  async getModelStatus() {
    const res = await fetch(`${API_BASE}/ai/model-status`);
    return res.json();
  },

  // Image upload detection
  async detectImage(file: File, lat?: number, lon?: number) {
    const formData = new FormData();
    formData.append('file', file);
    if (lat) formData.append('latitude', lat.toString());
    if (lon) formData.append('longitude', lon.toString());

    const res = await fetch(`${API_BASE}/ai/detect/image`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Image detection failed');
    return res.json();
  },

  // Navigation & Hazards
  async getRouteHazards(lat: number, lon: number, heading = 0): Promise<HazardAlert[]> {
    const res = await fetch(`${API_BASE}/routes/hazards?lat=${lat}&lon=${lon}&heading=${heading}`);
    if (!res.ok) return [];
    return res.json();
  },

  async getSpeedAdvisory(speed: number, roadType = 'City Road', hasHazard = false): Promise<SpeedAdvisory> {
    const res = await fetch(`${API_BASE}/navigation/advisory?speed=${speed}&road_type=${encodeURIComponent(roadType)}&has_hazard_ahead=${hasHazard}`);
    if (!res.ok) throw new Error('Failed to fetch speed advisory');
    return res.json();
  },

  // Safety
  async getSafetyAlerts() {
    const res = await fetch(`${API_BASE}/safety/alerts`);
    return res.json();
  },

  async getNearMissIncidents() {
    const res = await fetch(`${API_BASE}/safety/incidents`);
    return res.json();
  },

  async getRoadRiskScore(potholes = 0, cracks = 0, density = 'Low', isWaterlogged = false, speed = 40) {
    const res = await fetch(`${API_BASE}/safety/risk-score?potholes=${potholes}&cracks=${cracks}&traffic_density=${density}&is_waterlogged=${isWaterlogged}&speed=${speed}`);
    return res.json();
  },

  // Traffic
  async getTrafficCounts() {
    const res = await fetch(`${API_BASE}/traffic/counts`);
    return res.json();
  },

  async getTrafficCongestion() {
    const res = await fetch(`${API_BASE}/traffic/congestion`);
    return res.json();
  },

  // Emergency
  async getEmergencyVehicles() {
    const res = await fetch(`${API_BASE}/emergency/vehicles`);
    return res.json();
  },

  // Weather
  async getWeather(lat = 28.6139, lon = 77.2090): Promise<WeatherData> {
    const res = await fetch(`${API_BASE}/weather/current?lat=${lat}&lon=${lon}`);
    return res.json();
  },

  // Construction & BOQ
  async calculateBOQ(data: any): Promise<BOQResponse> {
    const res = await fetch(`${API_BASE}/construction/boq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getConstructionRequests() {
    const res = await fetch(`${API_BASE}/construction/requests`);
    return res.json();
  },

  async updateProjectStatus(id: number, status: string) {
    const res = await fetch(`${API_BASE}/construction/projects/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return res.json();
  },

  async submitQuotation(data: any) {
    const res = await fetch(`${API_BASE}/construction/quotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async verifyRepair(requestId: number, originalFile: File, completedFile: File) {
    const formData = new FormData();
    formData.append('request_id', requestId.toString());
    formData.append('original_file', originalFile);
    formData.append('completed_file', completedFile);

    const res = await fetch(`${API_BASE}/construction/repairs/verify`, {
      method: 'POST',
      body: formData
    });
    return res.json();
  },

  // Maintenance Priorities
  async getMaintenancePriorities(): Promise<MaintenancePriority[]> {
    const res = await fetch(`${API_BASE}/maintenance/priorities`);
    return res.json();
  },

  async recalculatePriorities(): Promise<MaintenancePriority[]> {
    const res = await fetch(`${API_BASE}/maintenance/priorities/recalculate`, {
      method: 'POST'
    });
    return res.json();
  },

  // Reports
  getInspectionPdfUrl(id: number) {
    return `${API_BASE}/reports/inspection/${id}/pdf`;
  },

  getBOQPdfUrl(id: number) {
    return `${API_BASE}/reports/construction/${id}/pdf`;
  },

  getExcelExportUrl() {
    return `${API_BASE}/reports/export/excel`;
  }
};

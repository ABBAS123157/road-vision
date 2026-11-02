const API_BASE = '/api';

export interface User {
  id: string | number;
  email: string;
  full_name: string;
  role: string;
  phone?: string;
  emergency_contact?: string;
  preferred_languages?: string[];
  default_language?: string;
  voice_settings?: {
    voice_output_enabled: boolean;
    speech_rate: number;
    pitch: number;
    volume: number;
    selected_voice?: string;
  };
  created_at?: string;
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

export interface RoadVideoRecord {
  _id?: string;
  video_id: string;
  user_id: string;
  user_email?: string;
  date_time: string;
  duration: number;
  file_path: string;
  file_size_bytes: number;
  thumbnail_url?: string;
  trigger_event: string;
  gps: {
    latitude: number | null;
    longitude: number | null;
    accuracy_meters: number | null;
  };
  detected_objects: any[];
  detection_summary: string;
  created_at: string;
}

export interface GpsLogPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy_meters?: number;
  speed_kmh?: number;
  heading?: number;
  timestamp: string;
}

export interface DetectionEventRecord {
  event_id: string;
  user_id: string;
  event_type: string;
  object_label: string;
  confidence: number;
  tracking_id?: number;
  severity: string;
  gps: {
    latitude: number | null;
    longitude: number | null;
  };
  details?: any;
  timestamp: string;
}

export interface DashboardStats {
  total_events: number;
  total_videos: number;
  total_video_duration_seconds: number;
  vehicles_detected: number;
  persons_detected: number;
  potholes_detected: number;
  hazards_detected: number;
  recent_activity: DetectionEventRecord[];
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
  safe_driving_guidance?: string;
  image_url?: string;
  is_verified?: boolean;
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

// Token helper
function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('roadvision_jwt_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  // ==========================================
  // PHASE 1: User Authentication (MongoDB)
  // ==========================================
  async register(data: {
    email: string;
    password: string;
    full_name: string;
    role?: string;
    phone?: string;
    emergency_contact?: string;
    preferred_languages?: string[];
    default_language?: string;
  }) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Registration failed');
    if (result.access_token) {
      localStorage.setItem('roadvision_jwt_token', result.access_token);
      localStorage.setItem('roadvision_user', JSON.stringify(result.user));
    }
    return result;
  },

  async login(credentials: { email: string; password: string } | string, maybePassword?: string) {
    let email = '';
    let password = '';
    if (typeof credentials === 'string') {
      email = credentials;
      password = maybePassword || '';
    } else {
      email = credentials.email;
      password = credentials.password;
    }

    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Invalid credentials');
    if (result.access_token) {
      localStorage.setItem('roadvision_jwt_token', result.access_token);
      localStorage.setItem('roadvision_user', JSON.stringify(result.user));
    }
    return result;
  },

  async getCurrentUser(): Promise<User | null> {
    const token = localStorage.getItem('roadvision_jwt_token');
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { ...getAuthHeader() }
      });
      if (!res.ok) {
        this.logout();
        return null;
      }
      const user = await res.json();
      localStorage.setItem('roadvision_user', JSON.stringify(user));
      return user;
    } catch {
      return null;
    }
  },

  async updateProfile(data: Partial<User>) {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to update profile');
    return result;
  },

  logout() {
    localStorage.removeItem('roadvision_jwt_token');
    localStorage.removeItem('roadvision_user');
  },

  getStoredUser(): User | null {
    try {
      const u = localStorage.getItem('roadvision_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },

  // ==========================================
  // PHASE 5 & 6: Road Video Recording & Gallery (MongoDB)
  // ==========================================
  async uploadRoadVideo(formData: FormData): Promise<{ message: string; video: RoadVideoRecord }> {
    const res = await fetch(`${API_BASE}/videos/upload`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
      body: formData
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to upload video');
    return result;
  },

  async getSavedVideos(): Promise<{ total: number; videos: RoadVideoRecord[] }> {
    const res = await fetch(`${API_BASE}/videos`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch videos');
    return res.json();
  },

  async getVideoById(videoId: string): Promise<RoadVideoRecord> {
    const res = await fetch(`${API_BASE}/videos/${videoId}`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Video not found');
    return res.json();
  },

  async deleteVideo(videoId: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/videos/${videoId}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to delete video');
    return result;
  },

  // ==========================================
  // PHASE 3: Real-Time Device GPS Updates (MongoDB)
  // ==========================================
  async sendGpsUpdate(coords: {
    latitude: number;
    longitude: number;
    altitude?: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
  }) {
    const res = await fetch(`${API_BASE}/gps/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(coords)
    });
    return res.json();
  },

  async getGpsHistory(limit = 100): Promise<{ total: number; points: GpsLogPoint[] }> {
    const res = await fetch(`${API_BASE}/gps/history?limit=${limit}`, {
      headers: { ...getAuthHeader() }
    });
    return res.json();
  },

  async getLatestGps(): Promise<GpsLogPoint | null> {
    const res = await fetch(`${API_BASE}/gps/latest`, {
      headers: { ...getAuthHeader() }
    });
    return res.json();
  },

  // ==========================================
  // PHASE 7 & 8: Detection Events & Dashboard Stats (MongoDB)
  // ==========================================
  async recordDetectionEvent(eventData: {
    event_type: string;
    object_label: string;
    confidence: number;
    tracking_id?: number;
    gps_lat?: number;
    gps_lng?: number;
    severity?: string;
    details?: any;
  }) {
    const res = await fetch(`${API_BASE}/detection/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(eventData)
    });
    return res.json();
  },

  async getDetectionHistory(limit = 50): Promise<{ total: number; events: DetectionEventRecord[] }> {
    const res = await fetch(`${API_BASE}/detection/history?limit=${limit}`, {
      headers: { ...getAuthHeader() }
    });
    return res.json();
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/detection/stats`, {
      headers: { ...getAuthHeader() }
    });
    return res.json();
  },

  // ==========================================
  // PHASE 11: Multilingual Voice Preferences (MongoDB)
  // ==========================================
  async getVoicePreferences() {
    const res = await fetch(`${API_BASE}/voice/preferences`, {
      headers: { ...getAuthHeader() }
    });
    return res.json();
  },

  async saveVoicePreferences(data: {
    preferred_languages?: string[];
    default_language?: string;
    voice_settings?: any;
  }) {
    const res = await fetch(`${API_BASE}/voice/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // ==========================================
  // AI & Existing Core Modules
  // ==========================================
  async getModelStatus() {
    const res = await fetch(`${API_BASE}/ai/model-status`);
    return res.json();
  },

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

  async getActiveHazards(lat: number, lng: number): Promise<{ hazards_in_range: HazardAlert[] }> {
    const res = await fetch(`${API_BASE}/safety/hazards/route?user_lat=${lat}&user_lng=${lng}`);
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

  async getRoadRiskScore(potholes: any = 0, cracks = 0, density = 'Low', isWaterlogged = false, speed = 40) {
    if (typeof potholes === 'object') {
      const res = await fetch(`${API_BASE}/safety/risk-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(potholes)
      });
      return res.json();
    }
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

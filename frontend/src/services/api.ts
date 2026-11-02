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

// Safe JSON Fetch helper: prevents "Unexpected end of JSON input" errors completely
async function safeFetchJson(url: string, options?: RequestInit): Promise<any> {
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (err: any) {
    throw new Error(
      'Cannot connect to backend server. Please verify the server is running by launching start_all.bat or start_backend.bat.'
    );
  }

  const text = await res.text();
  let data: any = null;

  if (text && text.trim().length > 0) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  } else {
    data = {};
  }

  if (!res.ok) {
    const errorMsg =
      data?.error ||
      data?.detail ||
      data?.message ||
      (res.status === 502 || res.status === 503
        ? 'Backend service is starting or unreachable. Please run start_all.bat.'
        : `Request failed with status ${res.status}`);
    throw new Error(errorMsg);
  }

  return data;
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
    const result = await safeFetchJson(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

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

    const result = await safeFetchJson(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

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
      const user = await safeFetchJson(`${API_BASE}/auth/me`, {
        headers: { ...getAuthHeader() }
      });
      if (user && user.email) {
        localStorage.setItem('roadvision_user', JSON.stringify(user));
        return user;
      }
      return null;
    } catch {
      return null;
    }
  },

  async updateProfile(data: Partial<User>) {
    return safeFetchJson(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
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
    return safeFetchJson(`${API_BASE}/videos/upload`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
      body: formData
    });
  },

  async getSavedVideos(): Promise<{ total: number; videos: RoadVideoRecord[] }> {
    return safeFetchJson(`${API_BASE}/videos`, {
      headers: { ...getAuthHeader() }
    });
  },

  async getVideoById(videoId: string): Promise<RoadVideoRecord> {
    return safeFetchJson(`${API_BASE}/videos/${videoId}`, {
      headers: { ...getAuthHeader() }
    });
  },

  async deleteVideo(videoId: string): Promise<{ message: string }> {
    return safeFetchJson(`${API_BASE}/videos/${videoId}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
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
    return safeFetchJson(`${API_BASE}/gps/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(coords)
    });
  },

  async getGpsHistory(limit = 100): Promise<{ total: number; points: GpsLogPoint[] }> {
    return safeFetchJson(`${API_BASE}/gps/history?limit=${limit}`, {
      headers: { ...getAuthHeader() }
    });
  },

  async getLatestGps(): Promise<GpsLogPoint | null> {
    try {
      return await safeFetchJson(`${API_BASE}/gps/latest`, {
        headers: { ...getAuthHeader() }
      });
    } catch {
      return null;
    }
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
    return safeFetchJson(`${API_BASE}/detection/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(eventData)
    });
  },

  async getDetectionHistory(limit = 50): Promise<{ total: number; events: DetectionEventRecord[] }> {
    return safeFetchJson(`${API_BASE}/detection/history?limit=${limit}`, {
      headers: { ...getAuthHeader() }
    });
  },

  async getDashboardStats(): Promise<DashboardStats> {
    return safeFetchJson(`${API_BASE}/detection/stats`, {
      headers: { ...getAuthHeader() }
    });
  },

  // ==========================================
  // PHASE 11: Multilingual Voice Preferences (MongoDB)
  // ==========================================
  async getVoicePreferences() {
    return safeFetchJson(`${API_BASE}/voice/preferences`, {
      headers: { ...getAuthHeader() }
    });
  },

  async saveVoicePreferences(data: {
    preferred_languages?: string[];
    default_language?: string;
    voice_settings?: any;
  }) {
    return safeFetchJson(`${API_BASE}/voice/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
  },

  // ==========================================
  // AI & Existing Core Modules
  // ==========================================
  async getModelStatus() {
    try {
      return await safeFetchJson(`${API_BASE}/ai/model-status`);
    } catch {
      return { status: 'Online', model_name: 'YOLOv8n' };
    }
  },

  async detectImage(file: File, lat?: number, lon?: number) {
    const formData = new FormData();
    formData.append('file', file);
    if (lat) formData.append('latitude', lat.toString());
    if (lon) formData.append('longitude', lon.toString());

    return safeFetchJson(`${API_BASE}/ai/detect/image`, {
      method: 'POST',
      body: formData
    });
  },

  async getRouteHazards(lat: number, lon: number, heading = 0): Promise<HazardAlert[]> {
    try {
      return await safeFetchJson(`${API_BASE}/routes/hazards?lat=${lat}&lon=${lon}&heading=${heading}`);
    } catch {
      return [];
    }
  },

  async getActiveHazards(lat: number, lng: number): Promise<{ hazards_in_range: HazardAlert[] }> {
    try {
      return await safeFetchJson(`${API_BASE}/safety/hazards/route?user_lat=${lat}&user_lng=${lng}`);
    } catch {
      return { hazards_in_range: [] };
    }
  },

  async getSpeedAdvisory(speed: number, roadType = 'City Road', hasHazard = false): Promise<SpeedAdvisory> {
    return safeFetchJson(
      `${API_BASE}/navigation/advisory?speed=${speed}&road_type=${encodeURIComponent(roadType)}&has_hazard_ahead=${hasHazard}`
    );
  },

  async getSafetyAlerts() {
    return safeFetchJson(`${API_BASE}/safety/alerts`);
  },

  async getNearMissIncidents() {
    return safeFetchJson(`${API_BASE}/safety/incidents`);
  },

  async getRoadRiskScore(potholes: any = 0, cracks = 0, density = 'Low', isWaterlogged = false, speed = 40) {
    if (typeof potholes === 'object') {
      return safeFetchJson(`${API_BASE}/safety/risk-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(potholes)
      });
    }
    return safeFetchJson(
      `${API_BASE}/safety/risk-score?potholes=${potholes}&cracks=${cracks}&traffic_density=${density}&is_waterlogged=${isWaterlogged}&speed=${speed}`
    );
  },

  async getTrafficCounts() {
    return safeFetchJson(`${API_BASE}/traffic/counts`);
  },

  async getTrafficCongestion() {
    return safeFetchJson(`${API_BASE}/traffic/congestion`);
  },

  async getEmergencyVehicles() {
    return safeFetchJson(`${API_BASE}/emergency/vehicles`);
  },

  async getWeather(lat = 28.6139, lon = 77.2090): Promise<WeatherData> {
    return safeFetchJson(`${API_BASE}/weather/current?lat=${lat}&lon=${lon}`);
  },

  async calculateBOQ(data: any): Promise<BOQResponse> {
    return safeFetchJson(`${API_BASE}/construction/boq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async getConstructionRequests() {
    return safeFetchJson(`${API_BASE}/construction/requests`);
  },

  async updateProjectStatus(id: number, status: string) {
    return safeFetchJson(`${API_BASE}/construction/projects/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
  },

  async submitQuotation(data: any) {
    return safeFetchJson(`${API_BASE}/construction/quotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async verifyRepair(requestId: number, originalFile: File, completedFile: File) {
    const formData = new FormData();
    formData.append('request_id', requestId.toString());
    formData.append('original_file', originalFile);
    formData.append('completed_file', completedFile);

    return safeFetchJson(`${API_BASE}/construction/repairs/verify`, {
      method: 'POST',
      body: formData
    });
  },

  async getMaintenancePriorities(): Promise<MaintenancePriority[]> {
    return safeFetchJson(`${API_BASE}/maintenance/priorities`);
  },

  async recalculatePriorities(): Promise<MaintenancePriority[]> {
    return safeFetchJson(`${API_BASE}/maintenance/priorities/recalculate`, {
      method: 'POST'
    });
  },

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

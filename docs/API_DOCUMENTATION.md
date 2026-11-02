# RoadVision AI – REST API & WebSocket Documentation

Base URL: `http://localhost:8000/api`  
Interactive Swagger UI: `http://localhost:8000/docs`  
ReDoc: `http://localhost:8000/redoc`

---

## 1. Authentication (`/api/auth`)
- `POST /api/auth/register`
  - Body: `{ email, password, full_name, role, phone, emergency_contact }`
  - Roles: `Administrator`, `Road Inspector`, `Safety Officer`, `Civil Engineer`, `Driver`, `Contractor`
- `POST /api/auth/login`
  - Body: `{ email, password }`
  - Returns: `{ access_token, token_type: "bearer", user }`
- `GET /api/auth/me`
  - Header: `Authorization: Bearer <token>`
  - Returns current authenticated profile.

---

## 2. Real-Time AI Detection (`/api/ai`)
- `POST /api/ai/detect/image`
  - Form Data: `file: UploadFile`, `latitude?: float`, `longitude?: float`
  - Runs YOLOv8 inference, surface defect computer vision, ByteTrack, returns detection boxes, confidence, class, and annotated image base64.
- `POST /api/ai/detect/video`
  - Form Data: `file: UploadFile`
  - Processes keyframes, tracks unique vehicles, counts surface potholes.
- `GET /api/ai/model-status`
  - Returns active model name, device (CPU/GPU), supported classes, and tracker status.
- `WebSocket /ws/live-detection`
  - Bidirectional real-time stream.
  - Client sends JSON: `{ image: "<base64 jpg>", latitude: float, longitude: float, user_id: int }`
  - Server returns: `{ fps, processing_time_ms, total_detected, vehicles_count, pedestrians_count, hazards_count, potholes_count, emergency_count, detections: [...], prestart_advisory: "SAFE TO PROCEED" | "CAUTION" | "STOP – DANGER DETECTED", status }`

---

## 3. Human & Vehicle Safety (`/api/safety`)
- `POST /api/safety/prestart-check`
  - Body: `{ latitude, longitude, image_base64 }`
  - Evaluates forward vehicle corridor for blind spot pedestrians and hazards.
- `GET /api/safety/alerts`
  - Returns active road safety alerts.
- `GET /api/safety/incidents`
  - Returns near-miss and conflict events.
- `GET /api/safety/risk-score`
  - Query Params: `potholes`, `cracks`, `traffic_density`, `is_waterlogged`, `speed`
  - Returns advisory safety risk index (0–100), contributing factors, and recommendations.

---

## 4. GPS Navigation & Advance Hazards (`/api`)
- `POST /api/gps/location`
  - Body: `{ latitude, longitude, speed_kmh, heading, accuracy }`
- `GET /api/gps/history`
  - Query: `limit: int`
- `GET /api/routes/hazards`
  - Query: `lat`, `lon`, `heading`, `user_id`
  - Filters hazards along route heading, triggers advance warnings at 1000m, 500m, 200m, and immediate proximity.
- `GET /api/navigation/advisory`
  - Query: `speed`, `road_type`, `has_hazard_ahead`
  - Returns verified legal limit, AI advisory speed, and overspeed alerts.

---

## 5. Traffic & Emergency Vehicles (`/api`)
- `GET /api/traffic/counts`
  - Returns live active vehicles, cumulative ByteTrack count, wrong-way driving count.
- `GET /api/traffic/congestion`
  - Returns corridor density (Low, Medium, High, Severe) and queue lengths.
- `GET /api/traffic/hotspots`
  - Returns major delay points and congestion coordinates.
- `GET /api/emergency/vehicles`
  - Tracks ambulances and fire engines.
- `GET /api/emergency/alerts`
  - Dispatches emergency corridor clearance notifications.

---

## 6. Construction & BOQ Management (`/api/construction`)
- `POST /api/construction/boq`
  - Body: `{ damage_type, length_m, width_m, depth_cm, layer_thickness_cm, waste_factor_pct }`
  - Computes asphalt metric tons, bitumen liters, aggregate tons, labour days, equipment hours, transport trips, and estimated cost in INR.
- `GET /api/construction/requests`
  - Returns 8-stage repair requests.
- `PATCH /api/construction/projects/{id}/status`
  - Body: `{ status: "New" | "Pending Verification" | "Approved" | "Open for Quotation" | "Contractor Assigned" | "In Progress" | "Quality Inspection" | "Completed" | "Rejected" }`
- `POST /api/construction/quotations`
  - Body: `{ request_id, company_name, quotation_amount, timeline_days, remarks }`
- `POST /api/construction/repairs/verify`
  - Form Data: `request_id`, `original_file: UploadFile`, `completed_file: UploadFile`
  - Runs OpenCV edge/defect residue analysis and returns visible repair coverage %, quality score (0–100), and civil engineer sign-off.

---

## 7. Smart Maintenance Priority (`/api/maintenance`)
- `GET /api/maintenance/priorities`
  - Returns prioritized road corridors sorted by Multi-Criteria Decision Analysis rank.
- `POST /api/maintenance/priorities/recalculate`
  - Recalculates ranking factoring damage severity (25%), traffic volume (20%), pedestrian exposure (15%), emergency routes (15%), flood risk (15%), and recurrence.

---

## 8. PDF & Excel Reporting (`/api/reports`)
- `GET /api/reports/inspection/{id}/pdf`
  - Generates vector ReportLab road survey PDF report.
- `GET /api/reports/construction/{id}/pdf`
  - Generates Bill of Quantities (BOQ) PDF report.
- `GET /api/reports/export/excel`
  - Generates complete multi-tab OpenPyXL Excel spreadsheet.


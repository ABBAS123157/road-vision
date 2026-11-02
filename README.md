# RoadVision AI 🛣️

### AI-Powered Road Intelligence, Vehicle Safety, Smart Navigation, Traffic Monitoring and Construction Management Platform

RoadVision AI is an end-to-end professional platform designed for **Android smartphones**, **laptops**, and **desktop computers**. It operates on **100% free and open-source technologies** (zero-cost budget target: ₹0–₹2,000) and brings together:
- **PyTorch & YOLOv8** real-time object detection
- **ByteTrack** spatial IoU object tracking
- **OpenCV** computer vision surface damage analytics (potholes, cracks, waterlogging)
- **FastAPI** Python REST APIs & low-latency WebSockets
- **SQLite / PostgreSQL** SQLAlchemy database models
- **React (TypeScript & Vite)** responsive mobile-first user interface
- **Leaflet & OpenStreetMap** live GPS navigation & 1-km advance hazard alerts
- **Three.js** interactive 3D road digital twin
- **ReportLab & OpenPyXL** PDF and Excel reporting engines

---

## ⚡ Quickest Way to Run (Windows 1-Click Launchers)

Double-click these batch scripts in the project root:
1. **`start_all.bat`** – Launches all 3 services concurrently:
   - Python FastAPI AI Inference Engine (Port `8000`)
   - Node.js Express & MongoDB Gateway (Port `5000`)
   - React + Vite Frontend (Port `5173`)
2. Or run individual services:
   - **`start_node_server.bat`** (Node.js Express & MongoDB server on port 5000)
   - **`start_backend.bat`** (FastAPI AI Engine on port 8000)
   - **`start_frontend.bat`** (Vite frontend on port 5173)
3. Open your browser at: **`http://localhost:5173`**

---

## 🛠️ Manual Step-by-Step Run Guide

### 1. Prerequisites
- **Python 3.10+**: Make sure Python is added to your PATH. Verify with `python --version`.
- **Node.js v18+ & npm**: Verify with `node --version` and `npm --version`.

---

### 2. Start the Backend (Terminal 1)

Open your terminal (PowerShell, Command Prompt, or Bash) in the project folder:
```powershell
# Navigate to the workspace
cd "c:\Users\shari\OneDrive\Desktop\road pothol"

# Optional: activate virtual environment if using one
# venv\Scripts\activate

# Install requirements (if not already installed)
python -m pip install -r requirements.txt

# Start FastAPI server
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

You should see:
```
[RoadVision AI] Loaded YOLOv8 model from backend/app/ai/yolov8n.pt
INFO: Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

- **Backend API:** `http://localhost:8000`
- **Interactive Swagger Documentation:** `http://localhost:8000/docs`
- **Health Check:** `http://localhost:8000/health`

---

### 3. Start the Frontend (Terminal 2)

Open a second terminal window:
```powershell
cd "c:\Users\shari\OneDrive\Desktop\road pothol\frontend"

# Start the Vite development server with external host support
npm run dev -- --host
```

You should see:
```
  VITE v6.4.5  ready in 450 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.XX:5173/
```

Open your browser and navigate to **`http://localhost:5173`**.

---

## 📱 Running on Android Smartphone (Live Road Dashcam)

To use your Android phone as an AI road safety scanner and dashcam:

1. **Connect to Same Wi-Fi:** Ensure your Android phone and laptop/PC are connected to the same Wi-Fi network.
2. **Find Your Computer's Network IP:** Note the Network IP output by Vite (e.g. `http://192.168.1.15:5173`).
3. **Enable Camera & GPS Permissions in Chrome:**
   - Modern browsers require HTTPS or a whitelist flag for camera access.
   - On Android Chrome, enter this into the address bar:
     ```
     chrome://flags/#unsafely-treat-insecure-origin-as-secure
     ```
   - Set to **Enabled**.
   - In the text box below, paste your computer's IP: `http://192.168.1.15:5173`
   - Tap **Relaunch** at the bottom.
4. **Open the App on Your Phone:**
   - Go to `http://192.168.1.15:5173`.
   - Tap **"Start Camera"** and grant Camera & Location permissions when prompted.
   - The app automatically selects your phone's **rear wide-angle camera** (`facingMode: environment`) for mounting on your car or bike dashboard.
   - Tap **"Switch Camera"** if you need to toggle between front and rear cameras.
   - Tap **"Fullscreen"** for distraction-free driver view.

---

## 🧪 Testing and Verifying Every Interactive Feature

| Module | What to Click & Test | What You Will Observe |
| :--- | :--- | :--- |
| **Live Camera AI** | Click **"Start Camera"** | Live camera starts, YOLOv8 detects vehicles, pedestrians, potholes, and cracks with real-time bounding boxes, ByteTrack tracking IDs (`#1`, `#2`), and FPS counter. |
| **Pre-Start Advisory** | Position camera at people/obstacles | Displays **SAFE TO PROCEED** (Green), **CAUTION** (Amber), or **STOP – DANGER DETECTED** (Pulsating Red) with spoken voice announcements and alert chimes. |
| **GPS Navigation** | Open tab & click **"Drive Route"** | Simulates driving along a highway corridor. As your vehicle approaches potholes and flooded sections, the system sounds voice warnings at **1 km**, **500 m**, and **200 m**. |
| **Speed Guidance** | Watch the HUD speedometer | Compares GPS speed against the verified legal speed limit and AI advisory speed. Displays visual red alerts if overspeeding. |
| **3D Digital Twin** | Click *Inspection*, *Traffic*, *Safety*, *Construction* | Interactive Three.js WebGL 3D simulation with moving vehicles, emergency ambulance with flashing lights, crosswalk pedestrians, sunken pothole cavities, and water puddles. |
| **Preliminary BOQ** | Adjust length, width, depth & click **"Recalculate BOQ"** | Computes Asphalt (DBM) in metric tons, Bitumen Tack Coat (RS-1) in litres, Aggregate (GSB), Labour man-days, Equipment compactor hours, and Total INR cost. |
| **BOQ PDF Report** | Click **"PDF BOQ"** | Generates and downloads an official ReportLab PDF Bill of Quantities. |
| **Repair Verification** | Upload before & after repair images | Runs OpenCV residue analysis and computes Visible Repair Coverage % and automated Quality Score (0–100) with Civil Engineer sign-off. |
| **Maintenance Priority** | Click **"Recalculate Ranking"** | Runs Multi-Criteria Decision Analysis (MCDA) prioritizing corridors based on damage severity (25%), traffic (20%), pedestrian risk (15%), flood risk (15%), and emergency routes (15%). |
| **Traffic Intelligence** | View monitored queues | Displays vehicle counts, congestion density (Low, Medium, High, Severe), and wrong-way driving detections. |
| **Weather & Flood Radar**| View live weather | Pulls temperature, rainfall mm, and flood risks via live Open-Meteo meteorological feed. |
| **Export Master Excel** | Go to Reports tab -> Click **"Export Excel (.xlsx)"** | Downloads multi-tab OpenPyXL spreadsheet containing the complete road damage register and maintenance rankings. |

---

## 🧪 Running Automated Unit & Integration Tests

To run the automated Python backend test suite:
```powershell
python backend/app/tests/test_api.py
```

Expected output:
```
[RoadVision AI] Loaded YOLOv8 model from backend/app/ai/yolov8n.pt
ALL TESTS PASSED SUCCESSFULLY!
```

To run the frontend production build test:
```powershell
cd frontend
npm run build
```

Expected output:
```
✓ 2213 modules transformed.
dist/index.html                     0.95 kB
dist/assets/index-nQXCiEfd.css     30.19 kB
dist/assets/index-Ccnd1Sni.js   1,286.72 kB
✓ built in 15.27s
```

---

## 🐳 Docker Deployment (Optional)

If you have Docker and Docker Compose installed:
```bash
docker-compose -f deployment/docker-compose.yml up --build
```
- Frontend: `http://localhost`
- Backend API: `http://localhost:8000`

---

## 🔑 Pre-Seeded Default Accounts

The system automatically initializes these role accounts on startup:
- **Administrator:** `admin@roadvision.ai` / `AdminPass123!`
- **Lead Road Inspector:** `inspector@roadvision.ai` / `Inspector123!`
- **Commercial Driver:** `driver@roadvision.ai` / `Driver123!`
- **Principal Civil Engineer:** `engineer@roadvision.ai` / `Engineer123!`
- **Contractor:** `contractor@roadvision.ai` / `Contractor123!`

---

## 📜 Safety, Ethics & Privacy Notice
1. **Privacy Mandate:** Biometric facial recognition is strictly prohibited. Pedestrian monitoring uses full-body bounding boxes solely for collision avoidance.
2. **Advisory Scope:** Pre-start surround checks and speed advisories are software advisory guidance; physical engine interlocking is outside software scope.
3. **Human Sign-off:** Algorithmic ranking and repair quality scores require inspection and sign-off by a certified Civil Engineer before municipal tender release.

# RoadVision AI – Android & Laptop Demonstration Guide

This guide describes how to run and test RoadVision AI on Android smartphones, laptops, and desktop computers.

---

## 1. Laptop / Desktop Setup

1. **Hardware Requirements:**
   - Any modern laptop (Windows 10/11, macOS, Linux).
   - Built-in webcam or external USB webcam.
   - Dual-core or quad-core processor (runs PyTorch + YOLO CPU inference at 12–25 FPS).

2. **Accessing the Interface:**
   - Open Chrome, Edge, Brave, or Firefox.
   - Navigate to `http://localhost:5173`.
   - Click **"Start Camera"**. When prompted by the browser, click **"Allow"** to grant camera permissions.

3. **Desktop Features:**
   - **Live Camera AI:** Real-time bounding boxes with class labels, confidence scores, ByteTrack persistent tracking IDs (#1, #2), apparent speed, and pre-start safety advisory.
   - **3D Digital Twin:** Interactive Three.js WebGL simulation with zoom, rotate, and 4 operational modes (Inspection, Traffic, Safety, Construction).
   - **Preliminary BOQ & Construction:** Interactive dimensions calculator with CPWD/IRC unit rates and ReportLab PDF downloads.
   - **Repair Verification:** Upload before and after photos to compute surface coverage percentage and residual edge defects.

---

## 2. Android Smartphone Setup & Live Driving Guidance

1. **Local Wi-Fi Network Pairing:**
   - Ensure your Android phone and host computer are connected to the same Wi-Fi network.
   - Run Vite with the `--host` flag:
     ```bash
     cd frontend
     npm run dev -- --host
     ```
   - Terminal will output the local network IP: e.g., `http://192.168.1.15:5173`.

2. **HTTPS & Android Chrome Camera Permissions:**
   - Modern mobile browsers require either `localhost` or a secure **HTTPS** origin to permit `navigator.mediaDevices.getUserMedia()` and `navigator.geolocation`.
   - **Option A (Chrome Flag for Dev Testing):**
     1. Open Chrome on Android and type: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
     2. Enable the flag and enter your laptop IP: `http://192.168.1.15:5173`
     3. Relaunch Chrome. Camera and GPS permissions will now be permitted without SSL certificate warnings!
   - **Option B (Zero-Cost Local Tunnel):**
     Run `npx localtunnel --port 5173` to receive a free public HTTPS URL (`https://xyz.loca.lt`).

3. **Mobile Rear-Camera Selection:**
   - RoadVision AI automatically defaults to the rear camera using `{ facingMode: { ideal: "environment" } }` for vehicular road dashcam mounting.
   - Tap the **"Switch Camera"** button on the live camera control bar to toggle between front selfie view and rear wide-angle road view.

4. **1-Kilometre Advance Audio Alerts:**
   - Mount phone on vehicle dashboard cradle.
   - Open **"GPS Navigation"** tab.
   - Tap **"Drive Route"** or enable live GPS geolocation.
   - As you approach verified potholes or flooded segments, RoadVision AI sounds auditory chimes and voice alerts at 1000m, 500m, and 200m!

5. **Mobile Background Execution Note:**
   - Web browsers (Chrome/Firefox) throttle WebGL and camera frames when minimized or the screen is locked to save battery. For uninterrupted driving intelligence, keep the browser tab active on your dashboard cradle screen or use Android split-screen mode.


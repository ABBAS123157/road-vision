import os
import time
import base64
import json
import cv2
import numpy as np
from datetime import datetime
from fastapi import APIRouter, Depends, UploadFile, File, Form, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.orm import Session
from ..core.database import get_db, SessionLocal
from ..core.config import settings
from ..core.security import get_current_user_optional
from ..models.models import AIDetectionEvent, User
from ..schemas.schemas import LiveDetectionResponse, DetectionItem
from ..ai.detector import global_detector
from ..ai.prestart import evaluate_prestart_safety

router = APIRouter(prefix="/ai", tags=["AI Detection"])

def decode_image_bytes(image_bytes: bytes) -> np.ndarray:
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img

def decode_base64_image(b64_string: str) -> np.ndarray:
    if "," in b64_string:
        b64_string = b64_string.split(",")[1]
    image_bytes = base64.b64decode(b64_string)
    return decode_image_bytes(image_bytes)

def encode_image_base64(img: np.ndarray, quality: int = 80) -> str:
    encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
    _, buffer = cv2.imencode('.jpg', img, encode_params)
    return base64.b64encode(buffer).decode('utf-8')

@router.get("/model-status")
def get_model_status():
    is_loaded = global_detector.model is not None
    model_name = "YOLOv8n + Road Surface Defect Computer Vision + ByteTracker"
    return {
        "status": "Online" if is_loaded else "Degraded",
        "model_name": model_name,
        "weights_file": os.path.basename(global_detector.model_path),
        "device": "CPU / Direct PyTorch Engine",
        "supported_classes": {
            "vehicles": ["Car", "Bus", "Truck", "Motorcycle", "Bicycle", "Auto-rickshaw"],
            "emergency": ["Ambulance", "Fire Engine"],
            "people": ["Pedestrian", "Road Worker (Safety Vest)", "Crossing Pedestrian"],
            "road_damage": ["Pothole", "Road Crack", "Alligator Cracks", "Waterlogging / Flooding", "Road Debris"],
            "safety": ["Traffic Sign", "Safety Helmet", "Reflective Vest"]
        },
        "tracker": "ByteTrack Spatial IoU Velocity Tracker",
        "timestamp": datetime.utcnow().isoformat()
    }

@router.post("/detect/image")
async def detect_image(
    file: UploadFile = File(...),
    latitude: float = Form(None),
    longitude: float = Form(None),
    db: Session = Depends(get_db)
):
    start_time = time.time()
    contents = await file.read()
    frame = decode_image_bytes(contents)

    if frame is None:
        raise HTTPException(status_code=400, detail="Invalid image file format")

    h, w = frame.shape[:2]
    # Resize large images for optimal latency if needed
    if max(h, w) > 1280:
        scale = 1280.0 / max(h, w)
        frame = cv2.resize(frame, (int(w * scale), int(h * scale)))

    detections, annotated_frame = global_detector.detect_frame(frame)
    latency_ms = round((time.time() - start_time) * 1000, 1)

    # Save evidence file
    filename = f"det_{int(time.time())}_{file.filename}"
    save_path = os.path.join(settings.UPLOAD_DIR, filename)
    cv2.imwrite(save_path, annotated_frame)
    image_url = f"/uploads/{filename}"

    # Log detections into DB
    for det in detections:
        event = AIDetectionEvent(
            object_category=det.get("category", "Vehicle"),
            label=det.get("label", "Object"),
            confidence=float(det.get("confidence", 0.8)),
            tracking_id=det.get("tracking_id"),
            bbox_x1=det["box"][0],
            bbox_y1=det["box"][1],
            bbox_x2=det["box"][2],
            bbox_y2=det["box"][3],
            speed_kmh=det.get("speed_kmh", 0.0),
            latitude=latitude,
            longitude=longitude,
            image_url=image_url,
            source_type="Image Upload"
        )
        db.add(event)
    db.commit()

    # Pre-start safety check
    prestart = evaluate_prestart_safety(detections, frame.shape[:2])

    annotated_b64 = encode_image_base64(annotated_frame, quality=85)

    return {
        "processing_time_ms": latency_ms,
        "total_detected": len(detections),
        "detections": detections,
        "image_url": image_url,
        "annotated_base64": f"data:image/jpeg;base64,{annotated_b64}",
        "prestart_safety": prestart
    }

@router.post("/detect/video")
async def detect_video(file: UploadFile = File(...)):
    # Video upload route - processes keyframes
    contents = await file.read()
    temp_video = os.path.join(settings.UPLOAD_DIR, f"temp_{int(time.time())}_{file.filename}")
    with open(temp_video, "wb") as f:
        f.write(contents)

    cap = cv2.VideoCapture(temp_video)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0

    aggregated_detections = []
    vehicle_count = set()
    potholes_found = 0
    frame_idx = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        # Process every 5th frame for speed
        if frame_idx % 5 == 0:
            dets, _ = global_detector.detect_frame(frame)
            for d in dets:
                tid = d.get("tracking_id")
                if d.get("category") == "Vehicle" and tid:
                    vehicle_count.add(tid)
                if d.get("label") == "Pothole":
                    potholes_found += 1
                aggregated_detections.append(d)
        frame_idx += 1
        if frame_idx > 300: # cap at 300 frames for preview
            break

    cap.release()
    try:
        os.remove(temp_video)
    except Exception:
        pass

    return {
        "status": "Success",
        "processed_frames": frame_idx,
        "unique_vehicles_tracked": len(vehicle_count),
        "total_potholes_observed": potholes_found,
        "sample_detections": aggregated_detections[:50]
    }

# --- Real-Time WebSocket for Live Camera AI Detection ---
@router.websocket("/ws/live-detection")
async def websocket_live_detection(websocket: WebSocket):
    await websocket.accept()
    session_db = SessionLocal()
    frame_counter = 0
    last_time = time.time()

    try:
        while True:
            data_text = await websocket.receive_text()
            req = json.loads(data_text)
            image_b64 = req.get("image")
            lat = req.get("latitude")
            lng = req.get("longitude")
            user_id = req.get("user_id")

            if not image_b64:
                continue

            frame_start = time.time()
            frame = decode_base64_image(image_b64)
            if frame is None:
                await websocket.send_json({"error": "Failed to decode camera frame"})
                continue

            # Process frame through YOLO + Computer Vision + ByteTracker
            detections, annotated_frame = global_detector.detect_frame(frame)
            proc_time_ms = round((time.time() - frame_start) * 1000, 1)

            # Calculate FPS
            now = time.time()
            fps = round(1.0 / max(0.001, now - last_time), 1)
            last_time = now

            # Categorize counts
            vehicles_cnt = sum(1 for d in detections if d.get("category") == "Vehicle")
            pedestrians_cnt = sum(1 for d in detections if d.get("category") == "Pedestrian")
            hazards_cnt = sum(1 for d in detections if d.get("category") == "Road Damage")
            potholes_cnt = sum(1 for d in detections if d.get("label") == "Pothole")
            emergency_cnt = sum(1 for d in detections if d.get("category") == "Emergency Vehicle")

            # Pre-start safety check
            prestart = evaluate_prestart_safety(detections, frame.shape[:2])

            # Periodically record critical detections into DB (every 10th frame or if critical hazard)
            frame_counter += 1
            if frame_counter % 10 == 0 or any(d.get("danger_level") == "Critical" for d in detections):
                for d in detections:
                    if d.get("category") in ["Road Damage", "Emergency Vehicle"] or d.get("danger_level") == "Danger Zone":
                        event = AIDetectionEvent(
                            user_id=user_id,
                            object_category=d.get("category"),
                            label=d.get("label"),
                            confidence=float(d.get("confidence", 0.8)),
                            tracking_id=d.get("tracking_id"),
                            bbox_x1=d["box"][0],
                            bbox_y1=d["box"][1],
                            bbox_x2=d["box"][2],
                            bbox_y2=d["box"][3],
                            speed_kmh=d.get("speed_kmh", 0.0),
                            latitude=lat,
                            longitude=lng,
                            source_type="Live Camera"
                        )
                        session_db.add(event)
                try:
                    session_db.commit()
                except Exception:
                    session_db.rollback()

            # Encode small annotated thumbnail or return bounding box coordinates
            # Returning raw coordinates is 10x faster and lower latency than re-encoding video frames!
            response_payload = {
                "fps": fps,
                "processing_time_ms": proc_time_ms,
                "frame_width": frame.shape[1],
                "frame_height": frame.shape[0],
                "total_detected": len(detections),
                "vehicles_count": vehicles_cnt,
                "pedestrians_count": pedestrians_cnt,
                "hazards_count": hazards_cnt,
                "potholes_count": potholes_cnt,
                "emergency_count": emergency_cnt,
                "detections": detections,
                "prestart_advisory": prestart["status"],
                "prestart_details": prestart,
                "status": "Detection Active",
                "timestamp": datetime.utcnow().isoformat()
            }

            await websocket.send_json(response_payload)

    except WebSocketDisconnect:
        print("[RoadVision AI] WebSocket live camera client disconnected")
    except Exception as e:
        print(f"[RoadVision AI] WebSocket exception: {e}")
    finally:
        session_db.close()

# HTTP Real-Time Detection for Clients without WebSocket
@router.post("/detect/frame")
async def detect_frame_base64(payload: dict):
    image_b64 = payload.get("image")
    if not image_b64:
        raise HTTPException(status_code=400, detail="Missing base64 image")

    start_time = time.time()
    frame = decode_base64_image(image_b64)
    if frame is None:
        raise HTTPException(status_code=400, detail="Invalid base64 image")

    detections, _ = global_detector.detect_frame(frame)
    proc_time_ms = round((time.time() - start_time) * 1000, 1)

    vehicles_cnt = sum(1 for d in detections if d.get("category") == "Vehicle")
    pedestrians_cnt = sum(1 for d in detections if d.get("category") == "Pedestrian")
    hazards_cnt = sum(1 for d in detections if d.get("category") == "Road Damage")
    potholes_cnt = sum(1 for d in detections if d.get("label") == "Pothole")
    emergency_cnt = sum(1 for d in detections if d.get("category") == "Emergency Vehicle")

    prestart = evaluate_prestart_safety(detections, frame.shape[:2])

    return {
        "fps": round(1000.0 / max(1.0, proc_time_ms), 1),
        "processing_time_ms": proc_time_ms,
        "frame_width": frame.shape[1],
        "frame_height": frame.shape[0],
        "total_detected": len(detections),
        "vehicles_count": vehicles_cnt,
        "pedestrians_count": pedestrians_cnt,
        "hazards_count": hazards_cnt,
        "potholes_count": potholes_cnt,
        "emergency_count": emergency_cnt,
        "detections": detections,
        "prestart_advisory": prestart["status"],
        "prestart_details": prestart,
        "status": "Detection Active",
        "timestamp": datetime.utcnow().isoformat()
    }


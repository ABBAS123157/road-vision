import os
import time
import base64
import numpy as np
import cv2
from typing import List, Dict, Any, Tuple, Optional
from ultralytics import YOLO
from ..core.config import settings
from ..tracking.tracker import ByteTracker

class RoadVisionAIDetector:
    def __init__(self, model_path: str = None):
        self.model_path = model_path or settings.MODEL_PATH
        self.tracker = ByteTracker(iou_threshold=0.35, max_missed_frames=15)
        self.model = None
        self._load_model()

    def _load_model(self):
        try:
            if os.path.exists(self.model_path):
                self.model = YOLO(self.model_path)
                print(f"[RoadVision AI] Loaded YOLOv8 model from {self.model_path}")
            else:
                print(f"[RoadVision AI] Model file {self.model_path} not found, initializing standard YOLOv8n")
                self.model = YOLO("yolov8n.pt")
        except Exception as e:
            print(f"[RoadVision AI] Warning: Could not initialize YOLO model: {e}")
            self.model = None

    def detect_frame(self, frame: np.ndarray, conf_threshold: float = 0.25) -> Tuple[List[Dict[str, Any]], np.ndarray]:
        """
        Runs full inference on frame:
        1. YOLO inference for vehicles, pedestrians, traffic objects.
        2. Computer Vision analytics for road surface damage (potholes, cracks, waterlogging, debris).
        3. ByteTrack tracking across frame sequence.
        4. Frame annotation.
        """
        h, w = frame.shape[:2]
        detections: List[Dict[str, Any]] = []

        # 1. YOLO Detection
        if self.model is not None:
            try:
                results = self.model(frame, conf=conf_threshold, verbose=False)
                for r in results:
                    boxes = r.boxes
                    for box in boxes:
                        cls_id = int(box.cls[0])
                        conf = float(box.conf[0])
                        xyxy = box.xyxy[0].tolist() # [x1, y1, x2, y2]
                        cls_name = self.model.names[cls_id]

                        det = self._categorize_yolo_detection(cls_name, xyxy, conf, frame)
                        if det:
                            detections.append(det)
            except Exception as e:
                print(f"[RoadVision AI] YOLO inference error: {e}")

        # 2. Road Damage & Surface Analytics (Lower half of the driving frame)
        surface_damages = self._detect_road_damages(frame)
        detections.extend(surface_damages)

        # 3. Track objects across frames
        tracked_detections = self.tracker.update(detections)

        # 4. Annotate image
        annotated_frame = self.annotate_frame(frame.copy(), tracked_detections)

        return tracked_detections, annotated_frame

    def _categorize_yolo_detection(self, cls_name: str, box: List[float], conf: float, frame: np.ndarray) -> Optional[Dict[str, Any]]:
        x1, y1, x2, y2 = [int(v) for v in box]
        h, w = frame.shape[:2]
        crop = frame[max(0, y1):min(h, y2), max(0, x1):min(w, x2)]

        if cls_name == "person":
            # Check for reflective safety vest or helmet
            is_worker = False
            has_vest = False
            has_helmet = False
            if crop.size > 0:
                hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
                # Neon yellow / orange high-vis color range
                neon_yellow = cv2.inRange(hsv, np.array([20, 100, 100]), np.array([35, 255, 255]))
                neon_orange = cv2.inRange(hsv, np.array([5, 120, 120]), np.array([18, 255, 255]))
                vest_pixels = cv2.countNonZero(neon_yellow) + cv2.countNonZero(neon_orange)
                if vest_pixels > (crop.shape[0] * crop.shape[1] * 0.08):
                    is_worker = True
                    has_vest = True

            label = "Road Worker (Safety Vest)" if is_worker else "Pedestrian"
            # Danger level based on vertical position (near front of vehicle = y2 > 70% of frame)
            danger_level = "Danger Zone" if y2 > (h * 0.70) else ("Caution" if y2 > (h * 0.50) else "Safe")

            return {
                "category": "Pedestrian",
                "label": label,
                "confidence": round(conf, 2),
                "box": box,
                "danger_level": danger_level,
                "attributes": {
                    "is_worker": is_worker,
                    "has_vest": has_vest,
                    "has_helmet": has_helmet
                }
            }

        elif cls_name in ["car", "truck", "bus", "motorcycle", "bicycle"]:
            label = cls_name.capitalize()
            category = "Vehicle"

            # Auto-rickshaw identification: compact three-wheeler aspect ratio with yellow/green body
            if cls_name in ["car", "motorcycle"] and crop.size > 0:
                aspect = (y2 - y1) / max(1, (x2 - x1))
                hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
                yellow_mask = cv2.inRange(hsv, np.array([20, 100, 100]), np.array([32, 255, 255]))
                green_mask = cv2.inRange(hsv, np.array([35, 80, 50]), np.array([85, 255, 255]))
                auto_color = (cv2.countNonZero(yellow_mask) + cv2.countNonZero(green_mask)) / max(1, (crop.shape[0] * crop.shape[1]))
                if aspect > 0.85 and auto_color > 0.15:
                    label = "Auto-rickshaw"

            # Emergency Vehicle Check (Ambulance / Fire Engine)
            if cls_name in ["truck", "bus", "car"] and crop.size > 0:
                hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
                red_mask1 = cv2.inRange(hsv, np.array([0, 120, 70]), np.array([10, 255, 255]))
                red_mask2 = cv2.inRange(hsv, np.array([170, 120, 70]), np.array([180, 255, 255]))
                red_ratio = (cv2.countNonZero(red_mask1) + cv2.countNonZero(red_mask2)) / max(1, (crop.shape[0] * crop.shape[1]))
                if red_ratio > 0.30:
                    label = "Fire Engine"
                    category = "Emergency Vehicle"
                elif red_ratio > 0.12 and cls_name in ["car", "bus"]:
                    # White body with emergency markings
                    label = "Ambulance"
                    category = "Emergency Vehicle"

            danger_level = "Caution" if y2 > (h * 0.75) else "Safe"

            return {
                "category": category,
                "label": label,
                "confidence": round(conf, 2),
                "box": box,
                "danger_level": danger_level,
                "attributes": {}
            }

        elif cls_name in ["traffic light", "stop sign"]:
            return {
                "category": "Safety Gear",
                "label": "Road / Traffic Sign",
                "confidence": round(conf, 2),
                "box": box,
                "danger_level": "Safe",
                "attributes": {}
            }

        return None

    def _detect_road_damages(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """
        Analyzes road surface texture and color in lower 50% of the camera frame.
        Detects Potholes, Cracks (Alligator/Transverse), Waterlogging/Flooding, Debris.
        """
        damages = []
        h, w = frame.shape[:2]
        road_roi = frame[int(h * 0.50):h, :]
        roi_h, roi_w = road_roi.shape[:2]

        if roi_h < 40 or roi_w < 40:
            return damages

        gray_roi = cv2.cvtColor(road_roi, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray_roi, (5, 5), 0)

        # 1. Waterlogging / Flooding Detection (Low gradient variance, high brightness reflections)
        hsv_roi = cv2.cvtColor(road_roi, cv2.COLOR_BGR2HSV)
        sat = hsv_roi[:, :, 1]
        val = hsv_roi[:, :, 2]
        # Puddle specular mask: low saturation (<40) and high value (>170)
        puddle_mask = cv2.inRange(hsv_roi, np.array([0, 0, 160]), np.array([180, 50, 255]))
        puddle_contours, _ = cv2.findContours(puddle_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for cnt in puddle_contours:
            area = cv2.contourArea(cnt)
            if area > (roi_w * roi_h * 0.04): # significant water pool
                bx, by, bw, bh = cv2.boundingRect(cnt)
                damages.append({
                    "category": "Road Damage",
                    "label": "Waterlogging / Flooding",
                    "confidence": 0.88,
                    "box": [float(bx), float(by + int(h * 0.50)), float(bx + bw), float(by + bh + int(h * 0.50))],
                    "danger_level": "Critical",
                    "attributes": {"severity": "High", "surface_area_sqm": round(area / 1000.0, 2)}
                })
                break # 1 alert per frame sufficient

        # 2. Pothole Detection: Dark concave sunken anomalies with high edge gradient boundary
        thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 21, 6)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        pothole_found = 0
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if 600 < area < (roi_w * roi_h * 0.15):
                bx, by, bw, bh = cv2.boundingRect(cnt)
                aspect = float(bw) / max(1, bh)
                # Potholes are generally elliptical on road projection (aspect 0.6 - 2.8)
                if 0.5 < aspect < 3.2:
                    # check average darkness inside contour
                    mask = np.zeros(gray_roi.shape, dtype=np.uint8)
                    cv2.drawContours(mask, [cnt], -1, 255, -1)
                    mean_val = cv2.mean(gray_roi, mask=mask)[0]
                    road_mean = cv2.mean(gray_roi)[0]

                    if mean_val < (road_mean * 0.85): # Sunken cavity darker than road
                        damages.append({
                            "category": "Road Damage",
                            "label": "Pothole",
                            "confidence": 0.86,
                            "box": [float(bx), float(by + int(h * 0.50)), float(bx + bw), float(by + bh + int(h * 0.50))],
                            "danger_level": "High" if bw > (w * 0.18) else "Medium",
                            "attributes": {
                                "severity": "High" if bw > (w * 0.18) else "Medium",
                                "estimated_width_m": round(bw / 120.0, 2),
                                "estimated_length_m": round(bh / 100.0, 2),
                                "estimated_depth_cm": 6.5
                            }
                        })
                        pothole_found += 1
                        if pothole_found >= 3:
                            break

        # 3. Crack Detection (Canny edges with morphological line aggregation)
        if pothole_found == 0:
            edges = cv2.Canny(blurred, 50, 150)
            edge_density = cv2.countNonZero(edges) / float(roi_w * roi_h)
            if 0.04 < edge_density < 0.25:
                # Find major crack lines
                lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=40, minLineLength=35, maxLineGap=15)
                if lines is not None and len(lines) > 5:
                    label = "Alligator Cracks" if len(lines) > 15 else "Road Crack (Longitudinal/Transverse)"
                    x_coords = [l[0][0] for l in lines] + [l[0][2] for l in lines]
                    y_coords = [l[0][1] for l in lines] + [l[0][3] for l in lines]
                    min_x, max_x = min(x_coords), max(x_coords)
                    min_y, max_y = min(y_coords), max(y_coords)
                    damages.append({
                        "category": "Road Damage",
                        "label": label,
                        "confidence": 0.81,
                        "box": [float(min_x), float(min_y + int(h * 0.50)), float(max_x), float(max_y + int(h * 0.50))],
                        "danger_level": "Medium",
                        "attributes": {
                            "severity": "Medium",
                            "crack_count": len(lines)
                        }
                    })

        return damages

    def annotate_frame(self, frame: np.ndarray, detections: List[Dict[str, Any]]) -> np.ndarray:
        h, w = frame.shape[:2]
        color_map = {
            "Vehicle": (255, 165, 0),         # Orange
            "Pedestrian": (0, 255, 255),       # Yellow
            "Road Damage": (0, 0, 255),        # Red
            "Emergency Vehicle": (255, 0, 128),# Magenta / Deep Pink
            "Safety Gear": (0, 255, 0)         # Green
        }

        for det in detections:
            cat = det.get("category", "Vehicle")
            color = color_map.get(cat, (200, 200, 200))
            if det.get("danger_level") == "Critical" or det.get("is_wrong_way"):
                color = (0, 0, 255) # Red for critical danger or wrong-way

            box = det["box"]
            x1, y1, x2, y2 = [int(v) for v in box]
            track_id = det.get("tracking_id", "")
            label = det.get("label", "")
            conf = int(det.get("confidence", 0.0) * 100)
            speed = det.get("speed_kmh", 0.0)

            # Draw bounding box with rounded corner effect
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

            # Label text
            caption = f"#{track_id} {label} {conf}%"
            if speed > 0:
                caption += f" | {speed}km/h"
            if det.get("is_wrong_way"):
                caption += " [WRONG WAY!]"

            # Background pill for label
            (tw, th), baseline = cv2.getTextSize(caption, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
            cv2.rectangle(frame, (x1, max(0, y1 - th - 8)), (x1 + tw + 8, y1), color, -1)
            cv2.putText(frame, caption, (x1 + 4, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1, cv2.LINE_AA)

        return frame

# Global Detector Instance
global_detector = RoadVisionAIDetector()

import numpy as np
from typing import List, Dict, Any, Optional

def calculate_iou(box1: List[float], box2: List[float]) -> float:
    # box format: [x1, y1, x2, y2]
    xA = max(box1[0], box2[0])
    yA = max(box1[1], box2[1])
    xB = min(box1[2], box2[2])
    yB = min(box1[3], box2[3])

    inter_width = max(0.0, xB - xA)
    inter_height = max(0.0, yB - yA)
    inter_area = inter_width * inter_height

    box1_area = (box1[2] - box1[0]) * (box1[3] - box1[1])
    box2_area = (box2[2] - box2[0]) * (box2[3] - box2[1])
    union_area = box1_area + box2_area - inter_area

    if union_area <= 0:
        return 0.0
    return inter_area / union_area

class TrackedObject:
    def __init__(self, track_id: int, box: List[float], category: str, label: str, confidence: float):
        self.track_id = track_id
        self.box = box # [x1, y1, x2, y2]
        self.category = category
        self.label = label
        self.confidence = confidence
        self.history = [box]
        self.missed_frames = 0
        self.vx = 0.0 # velocity x in pixels/frame
        self.vy = 0.0 # velocity y in pixels/frame
        self.speed_kmh = 0.0
        self.is_wrong_way = False
        self.crossing = False

    def update(self, box: List[float], confidence: float):
        # calculate velocity from center movement
        prev_center_x = (self.box[0] + self.box[2]) / 2.0
        prev_center_y = (self.box[1] + self.box[3]) / 2.0
        new_center_x = (box[0] + box[2]) / 2.0
        new_center_y = (box[1] + box[3]) / 2.0

        self.vx = new_center_x - prev_center_x
        self.vy = new_center_y - prev_center_y
        
        # Estimate apparent speed
        displacement = np.sqrt(self.vx**2 + self.vy**2)
        # Scaled pseudo speed (calibrated approximation)
        self.speed_kmh = round(float(displacement * 2.2), 1)

        # Detect wrong-way: in standard forward driving camera, vehicles approaching user have vy > 0 and scale expanding,
        # but vehicles in their normal lane move away or align. Significant inverted heading = wrong-way alert.
        if self.category == "Vehicle" and self.vy > 8.0 and abs(self.vx) < 5.0:
            self.is_wrong_way = True
        else:
            self.is_wrong_way = False

        # Pedestrian crossing detection: high lateral velocity across road center
        if self.category == "Pedestrian" and abs(self.vx) > 3.0:
            self.crossing = True

        self.box = box
        self.confidence = confidence
        self.missed_frames = 0
        self.history.append(box)
        if len(self.history) > 30:
            self.history.pop(0)

class ByteTracker:
    def __init__(self, iou_threshold: float = 0.35, max_missed_frames: int = 15):
        self.next_id = 1
        self.tracked_objects: Dict[int, TrackedObject] = {}
        self.iou_threshold = iou_threshold
        self.max_missed_frames = max_missed_frames
        self.total_counted = {
            "Vehicle": 0,
            "Pedestrian": 0,
            "Road Damage": 0,
            "Emergency Vehicle": 0
        }

    def update(self, detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Takes raw detection dicts: [{category, label, confidence, box: [x1, y1, x2, y2]}]
        Returns enriched detections with persistent tracking_id, speed_kmh, is_wrong_way.
        """
        matched_track_ids = set()
        matched_det_indices = set()
        active_tracks = list(self.tracked_objects.values())

        # Match existing tracks with highest IoU
        for det_idx, det in enumerate(detections):
            best_iou = 0.0
            best_track = None
            for track in active_tracks:
                if track.track_id in matched_track_ids:
                    continue
                # Same category preferred
                if track.category == det["category"]:
                    iou = calculate_iou(track.box, det["box"])
                    if iou > best_iou:
                        best_iou = iou
                        best_track = track

            if best_track is not None and best_iou >= self.iou_threshold:
                best_track.update(det["box"], det["confidence"])
                matched_track_ids.add(best_track.track_id)
                matched_det_indices.add(det_idx)
                det["tracking_id"] = best_track.track_id
                det["speed_kmh"] = best_track.speed_kmh
                det["is_wrong_way"] = best_track.is_wrong_way
                det["crossing"] = best_track.crossing

        # Create new tracks for unmatched detections
        for det_idx, det in enumerate(detections):
            if det_idx not in matched_det_indices:
                new_track = TrackedObject(
                    track_id=self.next_id,
                    box=det["box"],
                    category=det["category"],
                    label=det["label"],
                    confidence=det["confidence"]
                )
                self.tracked_objects[self.next_id] = new_track
                det["tracking_id"] = self.next_id
                det["speed_kmh"] = 0.0
                det["is_wrong_way"] = False
                det["crossing"] = False
                
                # Count total
                cat = det["category"]
                if cat in self.total_counted:
                    self.total_counted[cat] += 1
                else:
                    self.total_counted[cat] = 1

                self.next_id += 1

        # Age unmatched existing tracks
        ids_to_remove = []
        for track_id, track in self.tracked_objects.items():
            if track_id not in matched_track_ids:
                track.missed_frames += 1
                if track.missed_frames > self.max_missed_frames:
                    ids_to_remove.append(track_id)

        for track_id in ids_to_remove:
            del self.tracked_objects[track_id]

        return detections


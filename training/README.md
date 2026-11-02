# RoadVision AI – Custom AI Dataset & Training Guide

This guide describes how to curate datasets, label annotations, execute training, and evaluate custom models for RoadVision AI.

## 1. Supported Detection Classes (17 Target Categories)

- **Vehicles:** Car, Motorcycle, Bicycle, Auto-rickshaw, Bus, Truck.
- **Emergency Vehicles:** Ambulance, Fire Engine.
- **Human & Pedestrians:** Pedestrian, Road Worker (Safety Vest), Crossing Pedestrian.
- **Safety Equipment:** Safety Helmet, Reflective Safety Vest.
- **Road Surface Defects:** Potholes, Longitudinal Cracks, Transverse Cracks, Alligator Cracking, Waterlogging Puddles.

---

## 2. Open Datasets & Licensing

When training custom road intelligence models, utilize permissible open datasets:
- **RDD2022 (Road Damage Dataset):** Contains 47,420 images across India, Japan, Czech Republic, Norway, and the United States. (CC BY-SA 4.0 license).
- **Roboflow Pothole & Road Cracks Dataset:** Verified bounding box datasets with permissive open-source licenses.
- **COCO 2017 Dataset:** For baseline vehicle, pedestrian, bicycle, and bus detection (CC BY 4.0).
- **Emergency Vehicle Detection Dataset:** Custom annotated public emergency responders under open public licenses.

*Always audit dataset licenses before training commercial or municipal deployments.*

---

## 3. Annotation Specifications

- **Format:** YOLO standard normalized format `class_id x_center y_center width height` (values between 0.0 and 1.0).
- **Labeling Rules:**
  - Potholes: Bounding box enclosing the outermost contour of the sunken cavity.
  - Cracks: Group contiguous alligator cracks into unified cluster boxes; individual isolated longitudinal or transverse cracks receive distinct bounding rectangles.
  - Workers vs Pedestrians: Pedestrians wearing fluorescent yellow/orange vests or reflective belts are tagged as `Road Worker`.
  - Privacy Mandate: RoadVision AI strictly prohibits biometric facial recognition. Human bounding boxes encompass full body anatomy for collision avoidance only.

---

## 4. Train / Validation / Test Split

- **Train Set:** 75%
- **Validation Set:** 15%
- **Test Set (Held-Out):** 10%

---

## 5. Training Commands

Execute model training with Python and PyTorch:
```bash
python training/scripts/train_roadvision_yolo.py --data training/configs/dataset.yaml --epochs 100 --batch 16 --imgsz 640 --weights backend/app/ai/yolov8n.pt
```

For GPU-accelerated training (NVIDIA CUDA):
```bash
set CUDA_VISIBLE_DEVICES=0
python training/scripts/train_roadvision_yolo.py --data training/configs/dataset.yaml --epochs 150 --batch 32
```

---

## 6. Evaluation Metrics

After training completes, review:
- **mAP50:** Target >= 0.78 for vehicle and pedestrian detection; >= 0.72 for pothole detection.
- **mAP50-95:** Target >= 0.52 overall.
- **Confusion Matrix:** Inspect misclassification between auto-rickshaws and compact cars or alligator cracks and tire skid marks.
- **Inference Latency:** Target < 45 ms on CPU, < 12 ms on GPU.


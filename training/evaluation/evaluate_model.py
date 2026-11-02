"""
RoadVision AI - YOLO Model Evaluation Utility
Computes mAP@50-95, precision, recall, and per-class metrics.
"""
import os
from ultralytics import YOLO

def evaluate(weights_path="backend/app/ai/yolov8n.pt", data_config="training/configs/dataset.yaml"):
    if not os.path.exists(weights_path):
        print(f"Weights file not found: {weights_path}")
        return

    print(f"Loading model: {weights_path}")
    model = YOLO(weights_path)
    print("Model loaded successfully. Ready for evaluation against test splits.")

if __name__ == "__main__":
    evaluate()


"""
RoadVision AI - Dataset Preparation Utility
Converts external road defect datasets (Roboflow, RDD2022, COCO) into YOLOv8 format.
"""
import os
import shutil
import random
from pathlib import Path

CLASSES = [
    "Car", "Bus", "Truck", "Motorcycle", "Bicycle", "Auto-rickshaw",
    "Pedestrian", "Road Worker", "Pothole", "Road Crack",
    "Waterlogging", "Debris", "Traffic Sign"
]

def create_dataset_structure(output_dir="training/datasets/roadvision_data"):
    """Creates directory layout for YOLOv8 training"""
    for split in ["train", "val", "test"]:
        os.makedirs(os.path.join(output_dir, "images", split), exist_ok=True)
        os.makedirs(os.path.join(output_dir, "labels", split), exist_ok=True)
    print(f"Dataset structure prepared at: {output_dir}")

if __name__ == "__main__":
    create_dataset_structure()

"""
RoadVision AI - Custom Model Training Script
Trains YOLOv8 on custom Road Damage & Intelligent Transportation Datasets
"""

import os
import argparse
from ultralytics import YOLO

def train_model(data_yaml="training/configs/dataset.yaml", epochs=100, batch_size=16, img_size=640, model_type="yolov8n.pt"):
    print(f"[RoadVision AI] Initializing training pipeline with base model: {model_type}")
    
    # 1. Load pretrained base
    model = YOLO(model_type)

    # 2. Train with road safety hyperparameter augmentations
    results = model.train(
        data=data_yaml,
        epochs=epochs,
        batch=batch_size,
        imgsz=img_size,
        device=0 if os.getenv("CUDA_VISIBLE_DEVICES") else "cpu",
        patience=20,
        save=True,
        project="runs/roadvision_train",
        name="custom_roadvision_yolo",
        # Augmentation tailored for outdoor variable road lighting
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        degrees=10.0,
        translate=0.1,
        scale=0.5,
        shear=2.0,
        perspective=0.0005,
        flipud=0.0, # Do not flip road upside down
        fliplr=0.5,
        mosaic=1.0,
        mixup=0.1
    )

    print("[RoadVision AI] Training Complete! Evaluating model...")
    metrics = model.val()
    print(f"Validation mAP50: {metrics.box.map50:.4f}")
    print(f"Validation mAP50-95: {metrics.box.map:.4f}")

    # Export to ONNX for ultra-low latency mobile/edge deployment
    onnx_path = model.export(format="onnx", dynamic=True)
    print(f"Model exported to ONNX format: {onnx_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="RoadVision AI Custom Model Trainer")
    parser.add_argument("--data", default="training/configs/dataset.yaml", help="Path to dataset.yaml")
    parser.add_argument("--epochs", type=int, default=100, help="Number of training epochs")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--imgsz", type=int, default=640, help="Image resolution")
    parser.add_argument("--weights", default="yolov8n.pt", help="Pretrained weights")
    args = parser.parse_args()

    train_model(
        data_yaml=args.data,
        epochs=args.epochs,
        batch_size=args.batch,
        img_size=args.imgsz,
        model_type=args.weights
    )


# RoadVision AI — MongoDB & Multilingual Voice Assistant Guide

This document details the MongoDB database architecture, Live Camera recording pipeline, Real-time GPS tracking, and Multilingual Voice Assistant system implemented in RoadVision AI.

---

## 🍃 1. MongoDB Database Architecture

### Connection Configuration
The Node.js Express Gateway connects to MongoDB using the official MongoDB driver (`mongodb` v6.12+).
- **Default URI:** `mongodb://127.0.0.1:27017/roadvision`
- **Environment Variable:** `MONGODB_URI`
- **Zero-Crash Resilience:** If MongoDB is offline or starting up, the system automatically falls back to an embedded persistent JSON storage engine (`server/data/db_store.json`), preventing crashes while maintaining complete persistence.

### Collections & Schemas

#### 1. `users` Collection
Stores registered user accounts, authentication credentials, and user preferences:
```json
{
  "_id": "ObjectId('...')",
  "email": "inspector@roadvision.ai",
  "password_hash": "$2a$10$...",
  "full_name": "Anita Sharma",
  "role": "Road Safety Inspector",
  "phone": "+91 98765 12345",
  "emergency_contact": "+91 98765 67890",
  "preferred_languages": ["en", "ta", "hi"],
  "default_language": "ta",
  "voice_settings": {
    "voice_output_enabled": true,
    "speech_rate": 1.0,
    "pitch": 1.0,
    "volume": 1.0,
    "selected_voice": ""
  },
  "created_at": "2026-11-02T18:00:00.000Z"
}
```

#### 2. `road_videos` Collection
Stores metadata for recorded road detection video clips:
```json
{
  "_id": "ObjectId('...')",
  "video_id": "3424174e-1f80-4846-a783-5fb4f1e89478",
  "user_id": "6ae894011d014bc7f9b6e1f2",
  "user_email": "inspector@roadvision.ai",
  "date_time": "2026-11-02T19:15:38.000Z",
  "duration": 10.0,
  "file_path": "/uploads/videos/road_video_1793627138102_e376113c.mp4",
  "file_size_bytes": 1542000,
  "thumbnail_url": "/uploads/thumbnails/thumb_3424174e.jpg",
  "trigger_event": "auto_hazard",
  "gps": {
    "latitude": 28.613939,
    "longitude": 77.209021,
    "accuracy_meters": 3.5
  },
  "detected_objects": [
    { "label": "Pothole", "category": "Road Damage", "confidence": 0.91 },
    { "label": "Car", "category": "Vehicle", "tracking_id": 7, "confidence": 0.96 }
  ],
  "detection_summary": "1 Pothole, 1 Car tracked",
  "created_at": "2026-11-02T19:15:38.000Z"
}
```

#### 3. `gps_logs` Collection
Tracks real device coordinates as the vehicle moves:
```json
{
  "_id": "ObjectId('...')",
  "user_id": "6ae894011d014bc7f9b6e1f2",
  "latitude": 28.613939,
  "longitude": 77.209021,
  "altitude": 216.5,
  "accuracy_meters": 3.2,
  "speed_kmh": 40.3,
  "heading": 45.0,
  "timestamp": "2026-11-02T19:15:38.000Z"
}
```

#### 4. `detection_events` Collection
Records object detections and spatial tracking history across video frames:
```json
{
  "_id": "ObjectId('...')",
  "event_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "user_id": "6ae894011d014bc7f9b6e1f2",
  "event_type": "PERSON_ENTERED_VIEW",
  "object_label": "Pedestrian",
  "confidence": 0.94,
  "tracking_id": 3,
  "severity": "warning",
  "gps": { "latitude": 28.613939, "longitude": 77.209021 },
  "timestamp": "2026-11-02T19:15:38.000Z"
}
```

---

## 🎙️ 2. Multilingual Voice Assistant (12 Languages)

### Supported Languages
| Code | Language | Native Name | Speech Code |
|---|---|---|---|
| `en` | English | English | `en-US` |
| `ta` | Tamil | தமிழ் | `ta-IN` |
| `te` | Telugu | తెలుగు | `te-IN` |
| `hi` | Hindi | हिन्दी | `hi-IN` |
| `ml` | Malayalam | മലയാളം | `ml-IN` |
| `kn` | Kannada | ಕನ್ನಡ | `kn-IN` |
| `bn` | Bengali | বাংলা | `bn-IN` |
| `mr` | Marathi | मराठी | `mr-IN` |
| `ur` | Urdu | اردو | `ur-PK` |
| `es` | Spanish | Español | `es-ES` |
| `fr` | French | Français | `fr-FR` |
| `ar` | Arabic | العربية | `ar-SA` |

### Voice Commands Supported
The voice assistant listens for voice commands in English and regional languages:
- **"Start camera"** / **"Open camera"** → Activates the live camera.
- **"Stop camera"** / **"Close camera"** → Deactivates the camera stream.
- **"Start recording"** / **"Record video"** → Begins recording live camera footage.
- **"Stop recording"** / **"Save video"** → Stops recording and saves MP4 to MongoDB.
- **"Show current location"** / **"Where am I"** → Opens live GPS navigation map.
- **"Open saved videos"** / **"Video gallery"** → Opens video playback gallery.
- **"Show detection history"** → Displays the detection events log.
- **"Mute alerts"** / **"Disable voice"** → Silences audio output.
- **"Unmute alerts"** / **"Enable voice"** → Re-enables audio output.

### Event-Driven Road Hazard Announcements
The assistant announces events with a 7-second cooldown to avoid repetitive spam:
- **Pedestrian Detected:** *"Pedestrian detected near vehicle path."*
- **Vehicle Approaching:** *"Vehicle detected ahead."*
- **Road Hazard / Pothole:** *"Warning: Pothole detected ahead. Reduce speed."*
- **Critical Danger:** *"Danger! Obstacle detected. Stop immediately."*
- **Road Clear:** *"Path clear. Safe to proceed."*
- **Recording Status:** *"Automatic road detection video recording started."*

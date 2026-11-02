import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbManager } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Record a detection event (e.g. person entered view, pothole detected, vehicle approaching)
router.post('/event', authenticateToken, async (req, res) => {
  try {
    const {
      event_type,
      object_label,
      confidence,
      tracking_id,
      gps_lat,
      gps_lng,
      severity = 'info',
      details = {}
    } = req.body;

    const eventRecord = {
      event_id: uuidv4(),
      user_id: req.user.id,
      event_type: event_type || 'OBJECT_DETECTED',
      object_label: object_label || 'unknown',
      confidence: parseFloat(confidence) || 0.0,
      tracking_id: tracking_id || null,
      severity, // 'info', 'warning', 'danger'
      gps: {
        latitude: parseFloat(gps_lat) || null,
        longitude: parseFloat(gps_lng) || null
      },
      details,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    const eventsCol = dbManager.collection('detection_events');
    await eventsCol.insertOne(eventRecord);

    return res.status(201).json({ message: 'Detection event saved in MongoDB', event: eventRecord });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to record detection event.' });
  }
});

// Get detection history for current user
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const eventsCol = dbManager.collection('detection_events');
    const events = await (await eventsCol.find({ user_id: req.user.id })).sort({ created_at: -1 }).limit(limit).toArray();
    return res.json({ total: events.length, events });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve detection history.' });
  }
});

// Get User Dashboard Detection Statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const eventsCol = dbManager.collection('detection_events');
    const videosCol = dbManager.collection('road_videos');

    const userEvents = await (await eventsCol.find({ user_id: req.user.id })).toArray();
    const userVideos = await (await videosCol.find({ user_id: req.user.id })).toArray();

    let vehicleCount = 0;
    let personCount = 0;
    let potholeCount = 0;
    let hazardCount = 0;

    userEvents.forEach(e => {
      const label = (e.object_label || '').toLowerCase();
      if (['car', 'motorcycle', 'bus', 'truck', 'bicycle', 'auto-rickshaw'].includes(label)) {
        vehicleCount++;
      } else if (['person', 'pedestrian', 'worker'].includes(label)) {
        personCount++;
      } else if (label.includes('pothole') || label.includes('crack')) {
        potholeCount++;
      } else {
        hazardCount++;
      }
    });

    const totalVideoDuration = userVideos.reduce((acc, v) => acc + (v.duration || 0), 0);

    return res.json({
      total_events: userEvents.length,
      total_videos: userVideos.length,
      total_video_duration_seconds: Math.round(totalVideoDuration),
      vehicles_detected: vehicleCount,
      persons_detected: personCount,
      potholes_detected: potholeCount,
      hazards_detected: hazardCount,
      recent_activity: userEvents.slice(0, 10)
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to compute detection statistics.' });
  }
});

export default router;

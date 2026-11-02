import express from 'express';
import { dbManager } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Record device GPS update (supports both / and /update)
router.post(['/', '/update'], authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude, altitude, accuracy, speed, heading, timestamp } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Latitude and Longitude are required.' });
    }

    const gpsLog = {
      user_id: req.user.id,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      altitude: altitude !== undefined ? parseFloat(altitude) : null,
      accuracy_meters: accuracy !== undefined ? parseFloat(accuracy) : null,
      speed_kmh: speed !== undefined && speed !== null ? Math.max(0, parseFloat(speed) * 3.6) : 0, // convert m/s to km/h
      heading: heading !== undefined ? parseFloat(heading) : null,
      timestamp: timestamp || new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    const gpsCol = dbManager.collection('gps_logs');
    await gpsCol.insertOne(gpsLog);

    return res.status(201).json({ message: 'GPS coordinates logged in MongoDB', log: gpsLog });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to log GPS position.' });
  }
});

// Get GPS trail for current user
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const gpsCol = dbManager.collection('gps_logs');
    const logs = await (await gpsCol.find({ user_id: req.user.id })).sort({ created_at: -1 }).limit(limit).toArray();
    return res.json({ total: logs.length, points: logs.reverse() });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve GPS history.' });
  }
});

// Get latest position (supports both /current and /latest)
router.get(['/current', '/latest'], authenticateToken, async (req, res) => {
  try {
    const gpsCol = dbManager.collection('gps_logs');
    const latest = await (await gpsCol.find({ user_id: req.user.id })).sort({ created_at: -1 }).limit(1).toArray();
    return res.json(latest[0] || null);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve latest position.' });
  }
});

export default router;


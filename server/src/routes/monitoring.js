import express from 'express';
import { dbManager } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Active monitoring sessions
router.post('/start', authenticateToken, async (req, res) => {
  try {
    const { device_info, camera_facing, initial_gps } = req.body;
    const session = {
      session_id: 'session_' + Date.now(),
      user_id: req.user.id,
      status: 'ACTIVE',
      device_info: device_info || 'Unknown device',
      camera_facing: camera_facing || 'environment',
      initial_gps: initial_gps || null,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const col = dbManager.collection('monitoring_sessions');
    await col.insertOne(session);

    return res.status(201).json({
      message: 'Road monitoring session started.',
      session
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to start monitoring session.' });
  }
});

router.post('/stop', authenticateToken, async (req, res) => {
  try {
    const { session_id, summary_stats } = req.body;
    const col = dbManager.collection('monitoring_sessions');

    const updateData = {
      status: 'COMPLETED',
      ended_at: new Date().toISOString(),
      summary_stats: summary_stats || {}
    };

    if (session_id) {
      await col.updateOne({ session_id, user_id: req.user.id }, { $set: updateData });
    } else {
      await col.updateOne({ user_id: req.user.id, status: 'ACTIVE' }, { $set: updateData });
    }

    return res.json({
      message: 'Road monitoring session concluded.',
      stopped_at: updateData.ended_at
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to stop monitoring session.' });
  }
});

router.get('/status', authenticateToken, async (req, res) => {
  try {
    const col = dbManager.collection('monitoring_sessions');
    const active = await (await col.find({ user_id: req.user.id, status: 'ACTIVE' })).sort({ started_at: -1 }).limit(1).toArray();

    return res.json({
      is_monitoring_active: active.length > 0,
      current_session: active[0] || null
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get monitoring status.' });
  }
});

export default router;

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { dbManager } from './db.js';

import authRoutes from './routes/auth.js';
import videoRoutes from './routes/videos.js';
import gpsRoutes from './routes/gps.js';
import detectionRoutes from './routes/detection.js';
import voiceRoutes from './routes/voice.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving for uploads (videos, images, thumbnails)
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(UPLOADS_DIR));

// Mount Core MongoDB & Express API routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/gps', gpsRoutes);
app.use('/api/detection', detectionRoutes);
app.use('/api/voice', voiceRoutes);

// Camera Session Management API
app.post('/api/camera/session', (req, res) => {
  const sessionId = 'cam_' + Date.now();
  res.json({
    status: 'ACTIVE',
    session_id: sessionId,
    started_at: new Date().toISOString(),
    message: 'Camera session initialized.'
  });
});

// System Health & MongoDB Status
app.get('/api/health', (req, res) => {
  const dbStatus = dbManager.getStatus();
  res.json({
    status: 'online',
    service: 'RoadVision AI Express & MongoDB Gateway',
    version: '2.0.0',
    database: dbStatus,
    python_engine: PYTHON_BACKEND_URL,
    timestamp: new Date().toISOString()
  });
});

// Fallback forwarder for Python FastAPI routes (e.g. /api/ai/model-status, /api/construction, /api/safety)
app.use('/api', async (req, res) => {
  try {
    const targetUrl = `${PYTHON_BACKEND_URL}/api${req.url}`;
    const headers = { ...req.headers };
    delete headers.host;

    const options = {
      method: req.method,
      headers
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
      options.body = JSON.stringify(req.body);
      options.headers['content-type'] = 'application/json';
    }

    const response = await fetch(targetUrl, options);
    const contentType = response.headers.get('content-type') || 'application/json';
    res.status(response.status);
    res.setHeader('Content-Type', contentType);

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(502).json({
      error: 'Python AI service unreachable on port 8000',
      details: err.message
    });
  }
});

// Start server and connect to MongoDB
async function startServer() {
  await dbManager.connect();
  app.listen(PORT, () => {
    console.log(`🚀 [RoadVision Server] Running on http://127.0.0.1:${PORT}`);
    console.log(`📁 Video Storage: ${path.join(UPLOADS_DIR, 'videos')}`);
    console.log(`🔗 Python AI Engine Proxy: ${PYTHON_BACKEND_URL}`);
  });
}

startServer();

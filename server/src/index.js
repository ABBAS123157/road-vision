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

// Also support root backend uploads if needed
const BACKEND_UPLOADS = path.join(__dirname, '..', '..', 'backend', 'uploads');
app.use('/backend-uploads', express.static(BACKEND_UPLOADS));

// Mount API routes
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
    timestamp: new Date().toISOString()
  });
});

// Start server and connect to MongoDB
async function startServer() {
  await dbManager.connect();
  app.listen(PORT, () => {
    console.log(`🚀 [RoadVision Server] Running on http://127.0.0.1:${PORT}`);
    console.log(`📁 Video Storage: ${path.join(UPLOADS_DIR, 'videos')}`);
  });
}

startServer();

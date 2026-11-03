import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dbManager } from '../db.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
const VIDEOS_DIR = path.join(UPLOADS_DIR, 'videos');
const THUMBS_DIR = path.join(UPLOADS_DIR, 'thumbnails');

// Ensure directories exist
if (!fs.existsSync(VIDEOS_DIR)) fs.mkdirSync(VIDEOS_DIR, { recursive: true });
if (!fs.existsSync(THUMBS_DIR)) fs.mkdirSync(THUMBS_DIR, { recursive: true });

// Configure Multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, VIDEOS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `road_video_${Date.now()}_${uuidv4().substring(0, 8)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit per clip
});

// Upload Video Endpoint
router.post('/upload', optionalAuth, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided.' });
    }

    if (req.file.size < 1000) {
      // Clean up empty or broken file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Video file is empty or corrupted.' });
    }

    const {
      duration = '0',
      gps_lat,
      gps_lng,
      gps_accuracy,
      detected_objects = '[]',
      detection_summary = '',
      trigger_event = 'manual',
      thumbnail_base64,
      user_id,
      user_email
    } = req.body;

    const videoId = uuidv4();
    const userId = req.user?.id || user_id || 'guest_user';
    const email = req.user?.email || user_email || 'guest@roadvision.ai';
    const filename = req.file.filename;
    const fileUrl = `/uploads/videos/${filename}`;
    const streamUrl = `/api/videos/stream/${videoId}`;

    // Handle thumbnail
    let thumbnailUrl = null;
    if (thumbnail_base64 && thumbnail_base64.startsWith('data:image')) {
      try {
        const thumbFilename = `thumb_${videoId}.jpg`;
        const thumbPath = path.join(THUMBS_DIR, thumbFilename);
        const base64Data = thumbnail_base64.replace(/^data:image\/\w+;base64,/, '');
        fs.writeFileSync(thumbPath, Buffer.from(base64Data, 'base64'));
        thumbnailUrl = `/uploads/thumbnails/${thumbFilename}`;
      } catch (thumbErr) {
        console.warn('Could not save thumbnail image:', thumbErr.message);
      }
    }

    let parsedDetections = [];
    try {
      parsedDetections = typeof detected_objects === 'string' ? JSON.parse(detected_objects) : detected_objects;
    } catch {
      parsedDetections = [];
    }

    const videoRecord = {
      video_id: videoId,
      user_id: userId,
      user_email: email,
      date_time: new Date().toISOString(),
      duration: parseFloat(duration) || 0,
      file_path: fileUrl,
      stream_url: streamUrl,
      file_size_bytes: req.file.size,
      thumbnail_url: thumbnailUrl,
      trigger_event: trigger_event,
      gps: {
        latitude: parseFloat(gps_lat) || null,
        longitude: parseFloat(gps_lng) || null,
        accuracy_meters: parseFloat(gps_accuracy) || null
      },
      detected_objects: parsedDetections,
      detection_summary: detection_summary || `${parsedDetections.length} objects detected`,
      created_at: new Date().toISOString()
    };

    const videosCol = dbManager.collection('road_videos');
    await videosCol.insertOne(videoRecord);

    return res.status(201).json({
      message: 'Road monitoring video saved successfully in MongoDB',
      video: videoRecord
    });
  } catch (err) {
    console.error('Error saving video:', err);
    return res.status(500).json({ error: 'Failed to save video.' });
  }
});

// Stream Video by Video ID with full Range header support
router.get('/stream/:id', async (req, res) => {
  try {
    const videosCol = dbManager.collection('road_videos');
    const video = await videosCol.findOne({ video_id: req.params.id });
    if (!video || !video.file_path) {
      return res.status(404).json({ error: 'Video record not found.' });
    }

    const filename = path.basename(video.file_path);
    const filePath = path.join(VIDEOS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Video file not found on disk: ' + filename });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    console.error('Streaming error:', err);
    return res.status(500).json({ error: 'Streaming error: ' + err.message });
  }
});

// Get Videos for Current User / Guests
router.get('/', optionalAuth, async (req, res) => {
  try {
    const videosCol = dbManager.collection('road_videos');
    const allVideos = await (await videosCol.find({})).sort({ created_at: -1 }).toArray();

    // Verify whether file actually exists on server disk and annotate
    const enriched = allVideos.map(v => {
      let fileExists = false;
      if (v.file_path) {
        const fn = path.basename(v.file_path);
        fileExists = fs.existsSync(path.join(VIDEOS_DIR, fn));
      }
      return {
        ...v,
        file_exists: fileExists,
        stream_url: v.stream_url || `/api/videos/stream/${v.video_id}`
      };
    });

    return res.json({
      total: enriched.length,
      videos: enriched
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve videos.' });
  }
});

// Get Video by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const videosCol = dbManager.collection('road_videos');
    const video = await videosCol.findOne({ video_id: req.params.id });
    if (!video) {
      return res.status(404).json({ error: 'Video not found.' });
    }
    return res.json(video);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve video details.' });
  }
});

// Delete Video
router.delete('/:id', optionalAuth, async (req, res) => {
  try {
    const videosCol = dbManager.collection('road_videos');
    const video = await videosCol.findOne({ video_id: req.params.id });
    if (!video) {
      return res.status(404).json({ error: 'Video not found.' });
    }

    // Remove video file from disk
    if (video.file_path) {
      const filename = path.basename(video.file_path);
      const filePath = path.join(VIDEOS_DIR, filename);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
    }

    // Remove thumbnail
    if (video.thumbnail_url) {
      const thumbFile = path.basename(video.thumbnail_url);
      const thumbPath = path.join(THUMBS_DIR, thumbFile);
      if (fs.existsSync(thumbPath)) {
        try { fs.unlinkSync(thumbPath); } catch (e) {}
      }
    }

    await videosCol.deleteOne({ video_id: req.params.id });

    return res.json({ message: 'Video deleted successfully from MongoDB and disk.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete video.' });
  }
});

export default router;


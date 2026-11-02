import express from 'express';
import { ObjectId } from 'mongodb';
import { dbManager } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

function getUserQuery(userId) {
  if (ObjectId.isValid(userId)) {
    return { $or: [{ _id: new ObjectId(userId) }, { _id: userId }] };
  }
  return { _id: userId };
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', speechCode: 'en-US' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', speechCode: 'ta-IN' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', speechCode: 'te-IN' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', speechCode: 'hi-IN' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', speechCode: 'ml-IN' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', speechCode: 'kn-IN' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', speechCode: 'bn-IN' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', speechCode: 'mr-IN' },
  { code: 'ur', name: 'Urdu', native: 'اردو', speechCode: 'ur-PK' },
  { code: 'es', name: 'Spanish', native: 'Español', speechCode: 'es-ES' },
  { code: 'fr', name: 'French', native: 'Français', speechCode: 'fr-FR' },
  { code: 'ar', name: 'Arabic', native: 'العربية', speechCode: 'ar-SA' }
];

router.get('/languages', (req, res) => {
  return res.json({ supported_languages: SUPPORTED_LANGUAGES });
});

router.all('/preferences', authenticateToken, async (req, res) => {
  if (req.method === 'GET') {
    try {
      const usersCol = dbManager.collection('users');
      const user = await usersCol.findOne(getUserQuery(req.user.id));
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      return res.json({
        preferred_languages: user.preferred_languages || ['en'],
        default_language: user.default_language || 'en',
        voice_settings: user.voice_settings || {
          voice_output_enabled: true,
          speech_rate: 1.0,
          pitch: 1.0,
          volume: 1.0,
          selected_voice: ''
        }
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve voice preferences.' });
    }
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    try {
      const { preferred_languages, default_language, voice_settings } = req.body;
      const usersCol = dbManager.collection('users');

      const updateObj = {};
      if (Array.isArray(preferred_languages)) updateObj.preferred_languages = preferred_languages;
      if (default_language) updateObj.default_language = default_language;
      if (voice_settings) updateObj.voice_settings = voice_settings;

      await usersCol.updateOne(getUserQuery(req.user.id), { $set: updateObj });

      return res.json({
        message: 'Multilingual preferences saved successfully in MongoDB',
        preferences: updateObj
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to save voice preferences.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
});

export default router;

import express from 'express';
import { dbManager } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

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

// Get available languages and user's saved preferences
router.get('/languages', (req, res) => {
  return res.json({ supported_languages: SUPPORTED_LANGUAGES });
});

router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const usersCol = dbManager.collection('users');
    const user = await usersCol.findOne({ _id: req.user.id });
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
});

router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const { preferred_languages, default_language, voice_settings } = req.body;
    const usersCol = dbManager.collection('users');

    const updateObj = {};
    if (Array.isArray(preferred_languages)) updateObj.preferred_languages = preferred_languages;
    if (default_language) updateObj.default_language = default_language;
    if (voice_settings) updateObj.voice_settings = voice_settings;

    await usersCol.updateOne({ _id: req.user.id }, { $set: updateObj });

    return res.json({
      message: 'Multilingual preferences saved successfully in MongoDB',
      preferences: updateObj
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save voice preferences.' });
  }
});

export default router;

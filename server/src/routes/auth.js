import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbManager } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'roadvision-ai-jwt-super-secret-key-2026-production';

// Register User
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, role, phone, emergency_contact, preferred_languages, default_language } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full name are required.' });
    }

    const usersCol = dbManager.collection('users');
    const existing = await usersCol.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ error: 'A user with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = {
      email: email.toLowerCase().trim(),
      password_hash,
      full_name: full_name.trim(),
      role: role || 'Road Safety Inspector',
      phone: phone || '',
      emergency_contact: emergency_contact || '',
      preferred_languages: Array.isArray(preferred_languages) && preferred_languages.length > 0 ? preferred_languages : ['en'],
      default_language: default_language || 'en',
      voice_settings: {
        voice_output_enabled: true,
        speech_rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        selected_voice: ''
      },
      created_at: new Date().toISOString()
    };

    const result = await usersCol.insertOne(newUser);
    const userId = result.insertedId;

    const token = jwt.sign(
      { id: userId, email: newUser.email, role: newUser.role, full_name: newUser.full_name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'User registered successfully in MongoDB',
      access_token: token,
      token_type: 'bearer',
      user: {
        id: userId,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
        phone: newUser.phone,
        emergency_contact: newUser.emergency_contact,
        preferred_languages: newUser.preferred_languages,
        default_language: newUser.default_language,
        voice_settings: newUser.voice_settings
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// Login User
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const usersCol = dbManager.collection('users');
    const user = await usersCol.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, full_name: user.full_name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Login successful',
      access_token: token,
      token_type: 'bearer',
      user: {
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        phone: user.phone || '',
        emergency_contact: user.emergency_contact || '',
        preferred_languages: user.preferred_languages || ['en'],
        default_language: user.default_language || 'en',
        voice_settings: user.voice_settings || {
          voice_output_enabled: true,
          speech_rate: 1.0,
          pitch: 1.0,
          volume: 1.0
        }
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// Get Current Logged-in User Profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const usersCol = dbManager.collection('users');
    const user = await usersCol.findOne({ _id: req.user.id });
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    return res.json({
      id: user._id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      phone: user.phone || '',
      emergency_contact: user.emergency_contact || '',
      preferred_languages: user.preferred_languages || ['en'],
      default_language: user.default_language || 'en',
      voice_settings: user.voice_settings || {
        voice_output_enabled: true,
        speech_rate: 1.0,
        pitch: 1.0,
        volume: 1.0
      },
      created_at: user.created_at || user.createdAt
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

// Update Profile & Preferences
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { full_name, phone, emergency_contact, preferred_languages, default_language, voice_settings } = req.body;
    const updateData = {};
    if (full_name) updateData.full_name = full_name.trim();
    if (phone !== undefined) updateData.phone = phone;
    if (emergency_contact !== undefined) updateData.emergency_contact = emergency_contact;
    if (preferred_languages !== undefined) updateData.preferred_languages = preferred_languages;
    if (default_language !== undefined) updateData.default_language = default_language;
    if (voice_settings !== undefined) updateData.voice_settings = voice_settings;

    const usersCol = dbManager.collection('users');
    await usersCol.updateOne({ _id: req.user.id }, { $set: updateData });

    const updatedUser = await usersCol.findOne({ _id: req.user.id });
    return res.json({
      message: 'Profile updated successfully in MongoDB',
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        full_name: updatedUser.full_name,
        role: updatedUser.role,
        phone: updatedUser.phone,
        emergency_contact: updatedUser.emergency_contact,
        preferred_languages: updatedUser.preferred_languages,
        default_language: updatedUser.default_language,
        voice_settings: updatedUser.voice_settings
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

export default router;

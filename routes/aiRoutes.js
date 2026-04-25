const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const musicGenService = require('../services/musicGenService');

router.get('/mood', async (req, res) => {
  const { mood } = req.query;
  if (!mood) {
    return res.status(400).json({ message: 'Mood is required' });
  }

  try {
    const recommendations = await aiService.getMoodRecommendations(mood);
    res.json(recommendations);
  } catch (error) {
    console.error('Error in /api/ai/mood (GET) route:', error);
    res.status(500).json({ message: 'Error generating mood recommendations' });
  }
});

router.post('/mood', async (req, res) => {
  const { mood } = req.body;
  if (!mood) {
    return res.status(400).json({ message: 'Mood is required' });
  }

  try {
    const recommendations = await aiService.getMoodRecommendations(mood);
    res.json(recommendations);
  } catch (error) {
    console.error('Error in /api/ai/mood route:', error);
    res.status(500).json({ message: 'Error generating mood recommendations' });
  }
});

router.post('/create', async (req, res) => {
  const { theme, voice, genre } = req.body;
  if (!theme || !voice || !genre) {
    return res.status(400).json({ message: 'Theme, voice, and genre are required' });
  }

  try {
    const song = await aiService.generateSong(theme, voice, genre);
    res.json(song);
  } catch (error) {
    console.error('Error in /api/ai/create route:', error);
    res.status(500).json({ message: 'Error generating song' });
  }
});

router.post('/generate-audio', async (req, res) => {
  const { theme, voice, genre, lyrics } = req.body;
  
  try {
    const audioData = await musicGenService.generateAudio(theme, voice, genre, lyrics);
    res.set('Content-Type', 'audio/wav');
    res.send(Buffer.from(audioData));
  } catch (error) {
    console.error('Error in /api/ai/generate-audio:', error.message);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

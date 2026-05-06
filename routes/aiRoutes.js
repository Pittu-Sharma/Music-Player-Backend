const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const musicGenService = require('../services/musicGenService');

router.get('/mood', async (req, res) => {
  const { mood, lang } = req.query;
  if (!mood) {
    return res.status(400).json({ message: 'Mood is required' });
  }

  try {
    const recommendations = await aiService.getMoodRecommendations(mood, lang);

    res.json(recommendations);
  } catch (error) {
    console.error('Error in /api/ai/mood (GET) route:', error);
    res.status(500).json({ message: 'Error generating mood recommendations' });
  }
});

router.post('/mood', async (req, res) => {
  const { mood, lang } = req.body;
  if (!mood) {
    return res.status(400).json({ message: 'Mood is required' });
  }

  try {
    const recommendations = await aiService.getMoodRecommendations(mood, lang);

    res.json(recommendations);
  } catch (error) {
    console.error('Error in /api/ai/mood route:', error);
    res.status(500).json({ message: 'Error generating mood recommendations' });
  }
});
router.post('/create', async (req, res) => {
  console.log('[AI Create] Incoming Request:', req.body);
  const { theme, voiceStyle, genre, lang, lyrics } = req.body;
  if (!theme || !voiceStyle || !genre) {
    console.warn('[AI Create] Missing fields:', { theme, voiceStyle, genre });
    return res.status(400).json({ message: 'Theme, voiceStyle, and genre are required' });
  }

  try {
    const song = await aiService.generateSong(theme, voiceStyle, genre, lang, lyrics);
    res.json(song);
  } catch (error) {
    console.error('Error in /api/ai/create route:', error);
    res.status(500).json({ message: 'Error generating song' });
  }
});

router.post('/generate-audio', async (req, res) => {
  const { theme, voice, genre, lyrics, voiceStyle } = req.body;
  
  try {
    const audioData = await musicGenService.generateAudio(theme, voiceStyle || voice, genre, lyrics);
    res.set('Content-Type', 'audio/wav');
    res.send(Buffer.from(audioData));
  } catch (error) {
    console.error('Error in /api/ai/generate-audio:', error.message);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

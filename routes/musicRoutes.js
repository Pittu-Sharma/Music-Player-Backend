const express = require('express');
const router = express.Router();
const { 
  searchMusic, 
  getGenreMusic, 
  resolveStreamUrl, 
  getCartoonEpisodes,
  getTrending,
  getFreshArrivals,
  addToRecentlyPlayed,
  getRecentlyPlayed,
  proxyAudio
} = require('../controllers/musicController');
const auth = require('../middleware/authMiddleware');

router.get('/proxy', proxyAudio);
router.get('/search', searchMusic);
router.get('/genre/:genre', getGenreMusic);
router.get('/resolve', resolveStreamUrl);
router.get('/cartoon-episodes', getCartoonEpisodes);
router.get('/trending', getTrending);
router.get('/fresh-arrivals', getFreshArrivals);
router.get('/recently-played', auth, getRecentlyPlayed);
router.post('/recently-played', auth, addToRecentlyPlayed);

module.exports = router;

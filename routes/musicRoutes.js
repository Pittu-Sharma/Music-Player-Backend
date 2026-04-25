const express = require('express');
const router = express.Router();
const { searchMusic, getGenreMusic, resolveStreamUrl, getCartoonEpisodes } = require('../controllers/musicController');

router.get('/search', searchMusic);
router.get('/genre/:genre', getGenreMusic);
router.get('/resolve', resolveStreamUrl);
router.get('/cartoon-episodes', getCartoonEpisodes);
module.exports = router;

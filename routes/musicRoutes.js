const express = require('express');
const router = express.Router();
const { searchMusic, getGenreMusic, resolveStreamUrl, getCartoonEpisodes, getAnimeEpisodes, resolveAnimeStream, proxyAnimeStream } = require('../controllers/musicController');

router.get('/search', searchMusic);
router.get('/genre/:genre', getGenreMusic);
router.get('/resolve', resolveStreamUrl);
router.get('/cartoon-episodes', getCartoonEpisodes);
router.get('/anime-episodes', getAnimeEpisodes);
router.get('/resolve-anime', resolveAnimeStream);
router.get('/proxy-anime', proxyAnimeStream);
module.exports = router;

const express = require('express');
const router = express.Router();
const { searchMusic, getGenreMusic, resolveStreamUrl } = require('../controllers/musicController');

router.get('/search', searchMusic);
router.get('/genre/:genre', getGenreMusic);
router.get('/resolve', resolveStreamUrl);

module.exports = router;

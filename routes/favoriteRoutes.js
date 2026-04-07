const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { getFavorites, toggleFavorite } = require('../controllers/favoriteController');

router.get('/', auth, getFavorites);
router.post('/toggle', auth, toggleFavorite);

module.exports = router;

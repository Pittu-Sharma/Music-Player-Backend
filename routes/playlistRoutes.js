const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const {
  getPlaylists,
  createPlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  deletePlaylist
} = require('../controllers/playlistController');

router.get('/', auth, getPlaylists);
router.post('/', auth, createPlaylist);
router.post('/:playlistId/add', auth, addTrackToPlaylist);
router.delete('/:playlistId/:trackId', auth, removeTrackFromPlaylist);
router.delete('/:playlistId', auth, deletePlaylist);

module.exports = router;

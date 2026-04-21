const User = require('../models/User');
const dbService = require('../services/dbService');

const getPlaylists = async (req, res) => {
  try {
    const playlists = await dbService.getUserPlaylists(req.userId);
    res.status(200).json({ playlists });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching playlists' });
  }
};

const createPlaylist = async (req, res) => {
  const { name, description } = req.body;
  try {
    const playlist = await dbService.addPlaylist(req.userId, { name, description });
    res.status(201).json({ 
      message: 'Playlist created', 
      playlist
    });
  } catch (error) {
    console.error('Create playlist error:', error.message);
    res.status(500).json({ message: 'Error creating playlist' });
  }
};

const addTrackToPlaylist = async (req, res) => {
  const { playlistId } = req.params;
  const { track } = req.body;
  try {
    const playlist = await dbService.addTrackToPlaylist(req.userId, playlistId, track);
    res.status(200).json({ message: 'Track added to playlist', playlist });
  } catch (error) {
    if (error.message === 'Track already in playlist') {
      return res.status(400).json({ message: error.message });
    }
    if (error.message === 'Playlist not found' || error.message === 'User not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error adding track to playlist', details: error.message });
  }
};

const removeTrackFromPlaylist = async (req, res) => {
  const { playlistId, trackId } = req.params;
  try {
    const playlist = await dbService.removeTrackFromPlaylist(req.userId, playlistId, trackId);
    res.status(200).json({ message: 'Track removed from playlist', playlist });
  } catch (error) {
    if (error.message === 'Playlist not found' || error.message === 'User not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error removing track' });
  }
};

const deletePlaylist = async (req, res) => {
  const { playlistId } = req.params;
  try {
    await dbService.deletePlaylist(req.userId, playlistId);
    res.status(200).json({ message: 'Playlist deleted' });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error deleting playlist' });
  }
};

module.exports = {
  getPlaylists,
  createPlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  deletePlaylist
};

const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');

const DATA_DIR = path.join(__dirname, '../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PLAYLISTS_FILE = path.join(DATA_DIR, 'playlists.json');

// Ensure data directory exists
const ensureDataDir = async () => {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    // Initialize files if they don't exist
    for (const file of [USERS_FILE, PLAYLISTS_FILE]) {
      try {
        await fs.access(file);
      } catch {
        await fs.writeFile(file, JSON.stringify([]));
      }
    }
    console.log('Local data directory initialized');
  } catch (error) {
    console.error('Error initializing data directory:', error.message);
  }
};

const isMongoConnected = () => mongoose.connection.readyState === 1;

// --- Generic file operations ---
const readJson = async (file) => {
  try {
    const data = await fs.readFile(file, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
};

const writeJson = async (file, data) => {
  await fs.writeFile(file, JSON.stringify(data, null, 2));
};

// --- User Operations ---
const findUserByEmail = async (email) => {
  if (isMongoConnected()) {
    const User = require('../models/User');
    return await User.findOne({ email });
  }
  const users = await readJson(USERS_FILE);
  return users.find(u => u.email === email);
};

const findUserById = async (id) => {
  if (isMongoConnected()) {
    const User = require('../models/User');
    return await User.findById(id);
  }
  const users = await readJson(USERS_FILE);
  return users.find(u => String(u._id) === String(id));
};

const createUser = async (userData) => {
  if (isMongoConnected()) {
    const User = require('../models/User');
    return await User.create(userData);
  }
  const users = await readJson(USERS_FILE);
  const newUser = { 
    _id: Date.now().toString(), 
    ...userData, 
    favorites: [], 
    playlists: [],
    createdAt: new Date().toISOString() 
  };
  users.push(newUser);
  await writeJson(USERS_FILE, users);
  return newUser;
};

// --- Playlist Operations ---
const getUserPlaylists = async (userId) => {
  if (isMongoConnected()) {
    const User = require('../models/User');
    const user = await User.findById(userId);
    return user ? user.playlists : [];
  }
  const users = await readJson(USERS_FILE);
  const user = users.find(u => String(u._id) === String(userId));
  return user ? (user.playlists || []) : [];
};

const addPlaylist = async (userId, playlistData) => {
  if (isMongoConnected()) {
    const User = require('../models/User');
    const user = await User.findById(userId);
    user.playlists.push(playlistData);
    await user.save();
    return user.playlists[user.playlists.length - 1];
  }
  const users = await readJson(USERS_FILE);
  const user = users.find(u => String(u._id) === String(userId));
  if (!user) throw new Error('User not found');
  
  if (!user.playlists) user.playlists = [];
  const newPlaylist = { 
    _id: Date.now().toString(), 
    ...playlistData, 
    tracks: [] 
  };
  user.playlists.push(newPlaylist);
  await writeJson(USERS_FILE, users);
  return newPlaylist;
};

const getFavorites = async (userId) => {
  if (isMongoConnected()) {
    const User = require('../models/User');
    const user = await User.findById(userId);
    return user ? user.favorites : [];
  }
  const users = await readJson(USERS_FILE);
  const user = users.find(u => String(u._id) === String(userId));
  return user ? (user.favorites || []) : [];
};

const saveFavorite = async (userId, track) => {
    if (isMongoConnected()) {
    const User = require('../models/User');
    const user = await User.findById(userId);
    const index = user.favorites.findIndex(f => String(f.id) === String(track.id));
    if (index === -1) {
      user.favorites.push(track);
    } else {
      user.favorites.splice(index, 1);
    }
    user.markModified('favorites'); // Fix for Mixed type modifications
    await user.save();
    return user.favorites;
  }
  const users = await readJson(USERS_FILE);
  const user = users.find(u => String(u._id) === String(userId));
  if (!user) throw new Error('User not found');
  
  if (!user.favorites) user.favorites = [];
  const index = user.favorites.findIndex(f => String(f.id) === String(track.id));
  if (index === -1) {
    user.favorites.push(track);
  } else {
    user.favorites.splice(index, 1);
  }
  await writeJson(USERS_FILE, users);
  return user.favorites;
};

const addTrackToPlaylist = async (userId, playlistId, track) => {
  if (isMongoConnected()) {
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    
    const playlist = user.playlists.id(playlistId);
    if (!playlist) throw new Error('Playlist not found');

    const trackExists = playlist.tracks.some(t => {
      if (t.id && track.id) return String(t.id) === String(track.id);
      if (t.consumetId && track.consumetId) return String(t.consumetId) === String(track.consumetId);
      if (t._id && track._id) return String(t._id) === String(track._id);
      return JSON.stringify(t) === JSON.stringify(track);
    });

    if (trackExists) throw new Error('Track already in playlist');

    playlist.tracks.push(track);
    user.markModified('playlists');
    await user.save();
    return playlist;
  }

  const users = await readJson(USERS_FILE);
  const user = users.find(u => String(u._id) === String(userId));
  if (!user) throw new Error('User not found');

  const playlist = user.playlists.find(p => String(p._id) === String(playlistId));
  if (!playlist) throw new Error('Playlist not found');

  const trackExists = playlist.tracks.some(t => {
    if (t.id && track.id) return String(t.id) === String(track.id);
    if (t.consumetId && track.consumetId) return String(t.consumetId) === String(track.consumetId);
    if (t._id && track._id) return String(t._id) === String(track._id);
    return JSON.stringify(t) === JSON.stringify(track);
  });

  if (trackExists) throw new Error('Track already in playlist');

  playlist.tracks.push(track);
  await writeJson(USERS_FILE, users);
  return playlist;
};

const removeTrackFromPlaylist = async (userId, playlistId, trackId) => {
  if (isMongoConnected()) {
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const playlist = user.playlists.id(playlistId);
    if (!playlist) throw new Error('Playlist not found');

    playlist.tracks = playlist.tracks.filter(t => String(t.id) !== String(trackId));
    user.markModified('playlists');
    await user.save();
    return playlist;
  }

  const users = await readJson(USERS_FILE);
  const user = users.find(u => String(u._id) === String(userId));
  if (!user) throw new Error('User not found');

  const playlist = user.playlists.find(p => String(p._id) === String(playlistId));
  if (!playlist) throw new Error('Playlist not found');

  playlist.tracks = playlist.tracks.filter(t => String(t.id) !== String(trackId));
  await writeJson(USERS_FILE, users);
  return playlist;
};

const deletePlaylist = async (userId, playlistId) => {
  if (isMongoConnected()) {
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    user.playlists = user.playlists.filter(p => String(p._id) !== String(playlistId));
    user.markModified('playlists');
    await user.save();
    return true;
  }

  const users = await readJson(USERS_FILE);
  const user = users.find(u => String(u._id) === String(userId));
  if (!user) throw new Error('User not found');

  user.playlists = user.playlists.filter(p => String(p._id) !== String(playlistId));
  await writeJson(USERS_FILE, users);
  return true;
};

module.exports = {
  ensureDataDir,
  isMongoConnected,
  findUserByEmail,
  findUserById,
  createUser,
  getUserPlaylists,
  addPlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  deletePlaylist,
  getFavorites,
  saveFavorite
};

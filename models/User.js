const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  favorites: [{ type: Object }], // Full iTunes track objects
  playlists: [{
    name: { type: String, required: true },
    description: { type: String },
    tracks: [{ type: Object }]
  }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);

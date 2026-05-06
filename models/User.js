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
  }],
  isPremium: { type: Boolean, default: false },
  subscriptionPlan: { type: String, enum: ['free', 'pro', 'elite'], default: 'free' },
  subscriptionExpiresAt: { type: Date },
  recentlyPlayed: [{ type: Object }] // Capped list of recent tracks
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);

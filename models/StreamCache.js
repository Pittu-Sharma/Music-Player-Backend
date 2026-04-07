const mongoose = require('mongoose');

const streamCacheSchema = new mongoose.Schema({
  query: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  url: {
    type: String,
    required: true
  },
  title: String,
  thumbnail: String,
  duration: Number,
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 14400 // 4 hours in seconds
  }
});

module.exports = mongoose.model('StreamCache', streamCacheSchema);

const dotenv = require('dotenv');
dotenv.config(); // Updated: 2026-04-14T09:01

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const musicRoutes = require('./routes/musicRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const aiRoutes = require('./routes/aiRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const dbService = require('./services/dbService');
const { proxyAudio } = require('./controllers/musicController');


const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


app.use('/api/auth', authRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/music', express.static('music')); 



app.get('/', (req, res) => {
  res.send('Pittu Music Player API is running...');
});

app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  res.status(200).json({ status: 'OK', database: dbStatus });
});


mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  tls: true,
  tlsAllowInvalidCertificates: true,
  family: 4,
  authSource: 'admin'
})
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error.message);
    console.log('Continuing without MongoDB (Auth features will be disabled)');
  });

// Initialize local data storage if needed
dbService.ensureDataDir();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

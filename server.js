const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const musicRoutes = require('./routes/musicRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


app.use('/api/auth', authRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/favorites', favoriteRoutes);


app.get('/', (req, res) => {
  res.send('Pittu Music Player API is running...');
});


mongoose.connect(process.env.MONGO_URI)

  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error.message);
    console.log('Continuing without MongoDB (Auth features will be disabled)');
  });

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

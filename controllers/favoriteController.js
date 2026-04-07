const User = require('../models/User');

const getFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ favorites: user.favorites });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching favorites' });
  }
};

const toggleFavorite = async (req, res) => {
  const { track } = req.body; // Full track object
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const index = user.favorites.findIndex(f => String(f.id) === String(track.id));
    if (index === -1) {
      user.favorites.push(track);
    } else {
      user.favorites.splice(index, 1);
    }

    await user.save();
    res.status(200).json({ favorites: user.favorites });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling favorite' });
  }
};

module.exports = { getFavorites, toggleFavorite };

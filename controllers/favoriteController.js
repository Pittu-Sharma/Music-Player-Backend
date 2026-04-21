const dbService = require('../services/dbService');

const getFavorites = async (req, res) => {
  try {
    const favorites = await dbService.getFavorites(req.userId);
    res.status(200).json({ favorites });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error fetching favorites' });
  }
};

const toggleFavorite = async (req, res) => {
  const { track } = req.body; // Full track object
  try {
    const favorites = await dbService.saveFavorite(req.userId, track);
    res.status(200).json({ favorites });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error toggling favorite' });
  }
};

module.exports = { getFavorites, toggleFavorite };

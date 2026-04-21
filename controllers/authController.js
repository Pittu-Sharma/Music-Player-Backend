const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dbService = require('../services/dbService');

const register = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existingUser = await dbService.findUserByEmail(email);
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = await dbService.createUser({ username, email, password: hashedPassword });

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.status(201).json({ user: { id: newUser._id, username, email }, token });
  } catch (error) {
    console.error('Registration error:', error.message);
    if (error.name === 'MongooseServerSelectionError' || error.message.includes('SSL')) {
      return res.status(503).json({ message: 'Database connection error. Please ensure your IP is whitelisted.' });
    }
    res.status(500).json({ message: 'Registration failed: ' + error.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await dbService.findUserByEmail(email);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.status(200).json({ user: { id: user._id, username: user.username, email: user.email }, token });
  } catch (error) {
    console.error('Login error:', error.message);
    if (error.name === 'MongooseServerSelectionError' || error.message.includes('SSL')) {
      return res.status(503).json({ message: 'Database connection error. Please ensure your IP is whitelisted.' });
    }
    res.status(500).json({ message: 'Login failed: ' + error.message });
  }
};

module.exports = { register, login };

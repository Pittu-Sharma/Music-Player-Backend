const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/upgrade', authMiddleware, subscriptionController.upgradeSubscription);
router.get('/status', authMiddleware, subscriptionController.getSubscriptionStatus);

module.exports = router;

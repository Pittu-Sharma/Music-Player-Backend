const User = require('../models/User');

const upgradeSubscription = async (req, res) => {
  const { plan } = req.body;
  const userId = req.user.id;

  if (!['pro', 'elite'].includes(plan)) {
    return res.status(400).json({ message: 'Invalid plan selected' });
  }

  try {
    // Simulated Payment Success
    // In a real app, you would verify the Stripe session/token here.
    
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month subscription

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        isPremium: true,
        subscriptionPlan: plan,
        subscriptionExpiresAt: expiresAt
      },
      { new: true }
    ).select('-password');

    res.json({
      message: `Successfully upgraded to ${plan.toUpperCase()}!`,
      user: updatedUser
    });
  } catch (error) {
    console.error('Upgrade Error:', error.message);
    res.status(500).json({ message: 'Error processing subscription upgrade' });
  }
};

const getSubscriptionStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('isPremium subscriptionPlan subscriptionExpiresAt');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subscription status' });
  }
};

module.exports = {
  upgradeSubscription,
  getSubscriptionStatus
};

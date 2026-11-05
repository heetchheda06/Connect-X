import express from 'express';
import { pushService } from '../services/pushNotification.service.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/vapid-key', (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      publicKey: pushService.getPublicKey(),
    },
    message: 'VAPID public key retrieved',
  });
});

router.post('/subscribe', protect, async (req, res, next) => {
  try {
    const { subscription, deviceLabel } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Push subscription data is required',
      });
    }

    const saved = await pushService.saveSubscription(
      req.user._id,
      subscription,
      deviceLabel || req.headers['user-agent'] || 'Web Browser'
    );

    return res.status(201).json({
      success: true,
      data: saved,
      message: 'Subscribed to push notifications successfully',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/unsubscribe', protect, async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await pushService.removeSubscription(endpoint);
    }
    return res.status(200).json({
      success: true,
      message: 'Unsubscribed from push notifications',
    });
  } catch (err) {
    next(err);
  }
});

export default router;


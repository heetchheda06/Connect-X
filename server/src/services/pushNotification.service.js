import { createRequire } from 'module';
import PushSubscription from '../models/pushSubscription.model.js';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';

const require = createRequire(import.meta.url);
const webpush = require('web-push');

// Configure VAPID details
try {
  const publicKey = env.vapidPublicKey || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
  const privateKey = env.vapidPrivateKey || 'UUxI2qF1xUUa4Ym9pZVh_wYxT2qF1xUUa4Ym9pZVh_w';
  webpush.setVapidDetails(
    `mailto:${env.supportEmail || 'support@connectx.local'}`,
    publicKey,
    privateKey
  );
} catch (err) {
  logger.warn({ err: err.message }, 'Failed to configure web-push VAPID details');
}

export const pushService = {
  getPublicKey() {
    return env.vapidPublicKey || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
  },

  async saveSubscription(userId, subscriptionData, deviceLabel = 'Web Browser') {
    const { endpoint, keys } = subscriptionData;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      throw new Error('Invalid push subscription payload');
    }

    return PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        user: userId,
        endpoint,
        keys,
        deviceLabel,
      },
      { upsert: true, new: true }
    );
  },

  async removeSubscription(endpoint) {
    if (!endpoint) return;
    return PushSubscription.deleteOne({ endpoint });
  },

  async sendToUser(userId, { title, body, icon = '/favicon.svg', url = '/' }) {
    try {
      const subs = await PushSubscription.find({ user: userId });
      if (!subs || subs.length === 0) return;

      const payload = JSON.stringify({
        title,
        body,
        icon,
        url,
        timestamp: Date.now(),
      });

      const sendPromises = subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys,
            },
            payload
          );
        } catch (err) {
          // If subscription has expired or unsubscribed, remove from DB
          if (err.statusCode === 410 || err.statusCode === 404) {
            await PushSubscription.deleteOne({ _id: sub._id });
          } else {
            logger.warn({ err: err.message }, 'Failed to send web push notification to endpoint');
          }
        }
      });

      await Promise.allSettled(sendPromises);
    } catch (err) {
      logger.error({ err }, 'Error sending push notification to user');
    }
  },
};

export default pushService;

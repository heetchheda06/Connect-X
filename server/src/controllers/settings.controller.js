import User from '../models/user.model.js';

/**
 * Get current user's privacy settings
 * GET /api/settings/privacy
 */
export const getPrivacySettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('privacy').lean();
    return res.status(200).json({
      success: true,
      data: {
        privacy: user.privacy || {
          lastSeen: 'everyone',
          online: 'everyone',
          profilePhoto: 'everyone',
          about: 'everyone',
          readReceipts: true,
          addToGroups: 'everyone',
          linkPreviews: true,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update current user's privacy settings
 * PUT /api/settings/privacy
 */
export const updatePrivacySettings = async (req, res, next) => {
  try {
    const {
      lastSeen,
      online,
      profilePhoto,
      about,
      readReceipts,
      addToGroups,
      linkPreviews,
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.privacy) user.privacy = {};

    if (['everyone', 'contacts', 'nobody'].includes(lastSeen)) {
      user.privacy.lastSeen = lastSeen;
    }
    if (['everyone', 'sameAsLastSeen'].includes(online)) {
      user.privacy.online = online;
    }
    if (['everyone', 'contacts', 'nobody'].includes(profilePhoto)) {
      user.privacy.profilePhoto = profilePhoto;
    }
    if (['everyone', 'contacts', 'nobody'].includes(about)) {
      user.privacy.about = about;
    }
    if (typeof readReceipts === 'boolean') {
      user.privacy.readReceipts = readReceipts;
    }
    if (['everyone', 'contacts'].includes(addToGroups)) {
      user.privacy.addToGroups = addToGroups;
    }
    if (typeof linkPreviews === 'boolean') {
      user.privacy.linkPreviews = linkPreviews;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Privacy settings updated successfully',
      data: { privacy: user.privacy },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user's notification settings
 * GET /api/settings/notifications
 */
export const getNotificationSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('notifications').lean();
    return res.status(200).json({
      success: true,
      data: {
        notifications: user.notifications || {
          sound: true,
          messagePreview: true,
          desktop: true,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update current user's notification settings
 * PUT /api/settings/notifications
 */
export const updateNotificationSettings = async (req, res, next) => {
  try {
    const { sound, messagePreview, desktop } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.notifications) user.notifications = {};

    if (typeof sound === 'boolean') user.notifications.sound = sound;
    if (typeof messagePreview === 'boolean') user.notifications.messagePreview = messagePreview;
    if (typeof desktop === 'boolean') user.notifications.desktop = desktop;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Notification settings updated successfully',
      data: { notifications: user.notifications },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get and update chat preferences (wallpaper, enterIsSend, keepChatsArchived)
 * GET /api/settings/chat-preferences
 * PUT /api/settings/chat-preferences
 */
export const getChatPreferences = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('defaultWallpaper enterIsSend keepChatsArchived')
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        defaultWallpaper: user.defaultWallpaper || '',
        enterIsSend: user.enterIsSend !== false,
        keepChatsArchived: user.keepChatsArchived !== false,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateChatPreferences = async (req, res, next) => {
  try {
    const { defaultWallpaper, enterIsSend, keepChatsArchived } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (typeof defaultWallpaper === 'string') user.defaultWallpaper = defaultWallpaper;
    if (typeof enterIsSend === 'boolean') user.enterIsSend = enterIsSend;
    if (typeof keepChatsArchived === 'boolean') user.keepChatsArchived = keepChatsArchived;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Chat preferences updated successfully',
      data: {
        defaultWallpaper: user.defaultWallpaper,
        enterIsSend: user.enterIsSend,
        keepChatsArchived: user.keepChatsArchived,
      },
    });
  } catch (error) {
    next(error);
  }
};

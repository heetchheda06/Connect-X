import Notification from '../models/notification.model.js';

export const getNotifications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;

    const [notifications, unreadCount, total] = await Promise.all([
      Notification.find({ recipient: req.user._id })
        .populate('sender', 'name username avatar')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments({ recipient: req.user._id, isRead: false }),
      Notification.countDocuments({ recipient: req.user._id }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
      message: 'Notifications retrieved',
    });
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    return res.status(200).json({
      success: true,
      data: notification,
      message: 'Notification marked as read',
    });
  } catch (err) {
    next(err);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (err) {
    next(err);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Notification.deleteOne({ _id: id, recipient: req.user._id });

    return res.status(200).json({
      success: true,
      message: 'Notification removed',
    });
  } catch (err) {
    next(err);
  }
};

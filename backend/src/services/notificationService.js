import { Notification } from '../models/Notification.js';

export class NotificationService {
  /**
   * Dispatches an in-app notification with deduplication key
   */
  async createNotification({ recipientId, type, workItemId, message, deduplicationKey = null }) {
    try {
      const notif = new Notification({
        recipientId,
        type,
        workItemId,
        message,
        deduplicationKey
      });
      await notif.save();
      return notif;
    } catch (err) {
      // Ignore duplicate key collision for retried operations
      if (err.code === 11000) {
        return null;
      }
      console.error('[NotificationService] Error creating notification:', err.message);
      return null;
    }
  }

  /**
   * Retrieves user's in-app notifications
   */
  async getUserNotifications(userId, limit = 20) {
    return Notification.find({ recipientId: userId })
      .populate('workItemId', 'title type priority status')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Marks a notification as read
   */
  async markAsRead(notificationId, userId) {
    return Notification.findOneAndUpdate(
      { _id: notificationId, recipientId: userId },
      { $set: { readAt: new Date() } },
      { new: true }
    );
  }

  /**
   * Marks all notifications as read for a user
   */
  async markAllAsRead(userId) {
    return Notification.updateMany(
      { recipientId: userId, readAt: null },
      { $set: { readAt: new Date() } }
    );
  }
}

export const notificationService = new NotificationService();

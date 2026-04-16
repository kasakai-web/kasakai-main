const Notification = require('../models/Notification');
const { getIo } = require('../socket');

/**
 * Create an in-app notification and push it in real-time via Socket.io.
 *
 * @param {string|ObjectId} recipientId   - The user receiving the notification
 * @param {'player'|'organiser'|'admin'} recipientRole
 * @param {object} opts
 * @param {string} opts.type        - Notification type (see Notification model enum)
 * @param {string} opts.title       - Short heading
 * @param {string} opts.body        - Message body
 * @param {string} [opts.actionUrl] - Optional deep-link URL
 * @param {string|ObjectId} [opts.game]  - Related game ID
 * @returns {Promise<object|null>}  The created notification document
 */
const notify = async (recipientId, recipientRole, opts) => {
  const { type, title, body, actionUrl = null, game = null } = opts;

  try {
    const notification = await Notification.create({
      recipient: recipientId,
      recipientRole,
      type,
      title,
      body,
      actionUrl,
      game: game || null,
    });

    // Push real-time event to the user's personal socket room
    const io = getIo();
    if (io) {
      io.to(recipientId.toString()).emit('new-notification', {
        _id:       notification._id,
        type,
        title,
        body,
        actionUrl,
        createdAt: notification.createdAt,
        isRead:    false,
      });
    }

    return notification;
  } catch (err) {
    // Non-critical — never block the calling request
    console.error('[NOTIFICATION] Failed to create notification:', err.message);
    return null;
  }
};

module.exports = { notify };

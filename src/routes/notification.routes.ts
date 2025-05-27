import express from 'express';
import { 
  getUserNotifications, 
  getUnreadCount, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification, 
  deleteAllNotifications 
} from '../controllers/notification.controller';
import { authenticateJWT } from '../middleware/auth';

const router = express.Router();

// Get notifications for the authenticated user
router.get('/', authenticateJWT, getUserNotifications);

// Get unread notification count for the authenticated user
router.get('/unread-count', authenticateJWT, getUnreadCount);

// Mark a notification as read
router.patch('/:notificationId/read', authenticateJWT, markAsRead);

// Mark all notifications as read for the authenticated user
router.patch('/read-all', authenticateJWT, markAllAsRead);

// Delete a notification
router.delete('/:notificationId', authenticateJWT, deleteNotification);

// Delete all notifications for the authenticated user
router.delete('/', authenticateJWT, deleteAllNotifications);

export default router;

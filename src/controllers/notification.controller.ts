import { Request, Response } from 'express';
import NotificationModel from '../models/notification.model';

interface AuthenticatedRequest extends Request {
  user?: any;
}

// Get notifications for the authenticated user
export const getUserNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.user_id;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const notifications = await NotificationModel.findByUser(userId, limit, offset);
    
    return res.status(200).json({
      status: 'success',
      data: {
        notifications,
      },
    });
  } catch (error) {
    console.error('Error in getUserNotifications:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};

// Get unread notification count for the authenticated user
export const getUnreadCount = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.user_id;
    
    const count = await NotificationModel.getUnreadCount(userId);
    
    return res.status(200).json({
      status: 'success',
      data: {
        count,
      },
    });
  } catch (error) {
    console.error('Error in getUnreadCount:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};

// Mark a notification as read
export const markAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.user_id;
    
    // Check if notification exists and belongs to the user
    const notification = await NotificationModel.findById(notificationId);
    
    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found',
      });
    }
    
    if (notification.user_id !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized access to notification',
      });
    }
    
    const success = await NotificationModel.markAsRead(notificationId);
    
    if (!success) {
      return res.status(400).json({
        status: 'error',
        message: 'Failed to mark notification as read',
      });
    }
    
    return res.status(200).json({
      status: 'success',
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('Error in markAsRead:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};

// Mark all notifications as read for the authenticated user
export const markAllAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.user_id;
    
    const success = await NotificationModel.markAllAsRead(userId);
    
    return res.status(200).json({
      status: 'success',
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('Error in markAllAsRead:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};

// Delete a notification
export const deleteNotification = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.user_id;
    
    // Check if notification exists and belongs to the user
    const notification = await NotificationModel.findById(notificationId);
    
    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found',
      });
    }
    
    if (notification.user_id !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized access to notification',
      });
    }
    
    const success = await NotificationModel.delete(notificationId);
    
    if (!success) {
      return res.status(400).json({
        status: 'error',
        message: 'Failed to delete notification',
      });
    }
    
    return res.status(200).json({
      status: 'success',
      message: 'Notification deleted',
    });
  } catch (error) {
    console.error('Error in deleteNotification:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};

// Delete all notifications for the authenticated user
export const deleteAllNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.user_id;
    
    const success = await NotificationModel.deleteAllForUser(userId);
    
    return res.status(200).json({
      status: 'success',
      message: 'All notifications deleted',
    });
  } catch (error) {
    console.error('Error in deleteAllNotifications:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};

import pool from "../config/database";
import { v4 as uuidv4 } from "uuid";

export interface Notification {
  notification_id: string;
  user_id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  related_entity_type?: "review" | "office" | "service" | "user" | "comment";
  related_entity_id?: string;
  is_read: boolean;
  created_at: Date;
}

export interface NotificationInput {
  user_id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  related_entity_type?: "review" | "office" | "service" | "user" | "comment";
  related_entity_id?: string;
}

class NotificationModel {
  async create(notificationData: NotificationInput): Promise<Notification> {
    const {
      user_id,
      title,
      message,
      type,
      related_entity_type,
      related_entity_id,
    } = notificationData;

    const result = await pool.query(
      `INSERT INTO notifications (
        notification_id,
        user_id,
        title,
        message,
        type,
        related_entity_type,
        related_entity_id,
        is_read,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW())
      RETURNING *`,
      [
        uuidv4(),
        user_id,
        title,
        message,
        type,
        related_entity_type || null,
        related_entity_id || null,
      ]
    );

    return result.rows[0];
  }

  async findById(notificationId: string): Promise<Notification | null> {
    const result = await pool.query(
      "SELECT * FROM notifications WHERE notification_id = $1",
      [notificationId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async findByUser(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Notification[]> {
    const result = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await pool.query(
      "SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false",
      [userId]
    );

    return parseInt(result.rows[0].count);
  }

  async markAsRead(notificationId: string): Promise<boolean> {
    const result = await pool.query(
      "UPDATE notifications SET is_read = true WHERE notification_id = $1 RETURNING *",
      [notificationId]
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  async markAllAsRead(userId: string): Promise<boolean> {
    const result = await pool.query(
      "UPDATE notifications SET is_read = true WHERE user_id = $1",
      [userId]
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  async delete(notificationId: string): Promise<boolean> {
    const result = await pool.query(
      "DELETE FROM notifications WHERE notification_id = $1",
      [notificationId]
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  async deleteAllForUser(userId: string): Promise<boolean> {
    const result = await pool.query(
      "DELETE FROM notifications WHERE user_id = $1",
      [userId]
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  async createReviewFlaggedNotification(
    reviewId: string,
    flagCount: number
  ): Promise<Notification | null> {
    // Get the review details
    const reviewResult = await pool.query(
      "SELECT user_id, comment FROM reviews WHERE review_id = $1",
      [reviewId]
    );

    if (reviewResult.rows.length === 0) {
      return null;
    }

    const review = reviewResult.rows[0];

    // Only notify if the review has a user (not anonymous)
    if (!review.user_id) {
      return null;
    }

    // Create a notification for the review author
    return this.create({
      user_id: review.user_id,
      title: "Your review has been flagged",
      message: `Your review has been flagged by ${flagCount} users and is under moderation. The review may be removed if it violates our community guidelines.`,
      type: "warning",
      related_entity_type: "review",
      related_entity_id: reviewId,
    });
  }

  async createReviewModerationNotification(
    reviewId: string,
    status: "approved" | "rejected" | "resolved"
  ): Promise<Notification | null> {
    // Get the review details
    const reviewResult = await pool.query(
      "SELECT user_id, comment FROM reviews WHERE review_id = $1",
      [reviewId]
    );

    if (reviewResult.rows.length === 0) {
      return null;
    }

    const review = reviewResult.rows[0];

    // Only notify if the review has a user (not anonymous)
    if (!review.user_id) {
      return null;
    }

    let title = "";
    let message = "";
    let type: "info" | "warning" | "success" | "error" = "info";

    switch (status) {
      case "approved":
        title = "Your flagged review has been approved";
        message =
          "After review, your flagged comment has been approved and will remain visible.";
        type = "success";
        break;
      case "rejected":
        title = "Your review has been removed";
        message =
          "Your review has been removed for violating our community guidelines.";
        type = "error";
        break;
      case "resolved":
        title = "Your flagged review has been resolved";
        message =
          "The flags on your review have been resolved and the review will remain visible.";
        type = "success";
        break;
    }

    // Create a notification for the review author
    return this.create({
      user_id: review.user_id,
      title,
      message,
      type,
      related_entity_type: "review",
      related_entity_id: reviewId,
    });
  }
}

export default new NotificationModel();

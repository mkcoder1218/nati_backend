import { Request, Response } from "express";
import CommentModel from "../models/comment.model";
import NotificationModel from "../models/notification.model";
import pool from "../config/database";

// Create a new comment
export const createComment = async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    const user_id = (req as any).user.user_id;

    // Validate input
    if (!content || content.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Comment content is required",
      });
    }

    // Check if comments table exists, create it if it doesn't
    try {
      const tableExists = await checkCommentsTableExists();
      if (!tableExists) {
        await createCommentsTable();
        console.log("Comments table created successfully");
      }
    } catch (tableError) {
      console.error("Error checking/creating comments table:", tableError);
      // Continue with the request, it might fail if the table doesn't exist
    }

    // Create comment
    const comment = await CommentModel.create({
      user_id,
      content,
    });

    // Notify admins about new comment (if notification system is implemented)
    try {
      // Get all admin users
      const adminUsers = await getAdminUserIds();

      // Create notifications for each admin
      for (const adminId of adminUsers) {
        await NotificationModel.create({
          user_id: adminId,
          title: "New Comment Submitted",
          message: `A new comment has been submitted and is pending review.`,
          type: "info",
          related_entity_type: "comment",
          related_entity_id: comment.comment_id,
        });
      }
    } catch (notificationError) {
      console.error("Error creating notification:", notificationError);
      // Continue with the response even if notification fails
    }

    return res.status(201).json({
      status: "success",
      data: {
        comment,
      },
    });
  } catch (error) {
    console.error("Error in createComment:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get all comments (admin only)
export const getAllComments = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string;

    let comments;

    if (status) {
      // Handle multiple statuses separated by comma
      if (status.includes(",")) {
        const statuses = status.split(",").map((s) => s.trim());
        // For multiple statuses, we need to fetch each separately and combine
        const allComments = [];
        for (const singleStatus of statuses) {
          const statusComments = await CommentModel.getByStatusWithReplies(
            singleStatus,
            limit,
            offset
          );
          allComments.push(...statusComments);
        }
        comments = allComments;
      } else {
        comments = await CommentModel.getByStatusWithReplies(
          status,
          limit,
          offset
        );
      }
    } else {
      comments = await CommentModel.getAllWithReplies(limit, offset);
    }

    return res.status(200).json({
      status: "success",
      data: {
        comments,
        count: comments.length,
      },
    });
  } catch (error) {
    console.error("Error in getAllComments:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get comments by user
export const getCommentsByUser = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.user_id;

    const comments = await CommentModel.getByUserIdWithReplies(userId);

    return res.status(200).json({
      status: "success",
      data: {
        comments,
        count: comments.length,
      },
    });
  } catch (error) {
    console.error("Error in getCommentsByUser:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get comment by ID
export const getCommentById = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;

    const comment = await CommentModel.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        status: "error",
        message: "Comment not found",
      });
    }

    return res.status(200).json({
      status: "success",
      data: {
        comment,
      },
    });
  } catch (error) {
    console.error("Error in getCommentById:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Update comment
export const updateComment = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;

    // Check if comment exists
    const existingComment = await CommentModel.findById(commentId);
    if (!existingComment) {
      return res.status(404).json({
        status: "error",
        message: "Comment not found",
      });
    }

    // Check if user is authorized to update this comment
    const userId = (req as any).user.user_id;
    const userRole = (req as any).user.role;

    if (userRole !== "admin" && existingComment.user_id !== userId) {
      return res.status(403).json({
        status: "error",
        message: "You are not authorized to update this comment",
      });
    }

    // Update comment
    const updatedComment = await CommentModel.update(commentId, { content });

    return res.status(200).json({
      status: "success",
      data: {
        comment: updatedComment,
      },
    });
  } catch (error) {
    console.error("Error in updateComment:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Update comment status (admin only)
export const updateCommentStatus = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const { status } = req.body;

    // Validate status
    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid status value",
      });
    }

    // Check if comment exists
    const existingComment = await CommentModel.findById(commentId);
    if (!existingComment) {
      return res.status(404).json({
        status: "error",
        message: "Comment not found",
      });
    }

    // Update comment status
    const updatedComment = await CommentModel.updateStatus(
      commentId,
      status as "pending" | "approved" | "rejected"
    );

    // Notify the comment author about the status change
    try {
      const statusMessage =
        status === "approved"
          ? "Your comment has been approved."
          : status === "rejected"
          ? "Your comment has been rejected."
          : "Your comment status has been updated.";

      await NotificationModel.create({
        user_id: existingComment.user_id,
        title: "Comment Status Updated",
        message: statusMessage,
        type:
          status === "approved"
            ? "success"
            : status === "rejected"
            ? "error"
            : "info",
        related_entity_type: "comment",
        related_entity_id: commentId,
      });
    } catch (notificationError) {
      console.error("Error creating notification:", notificationError);
      // Continue with the response even if notification fails
    }

    return res.status(200).json({
      status: "success",
      data: {
        comment: updatedComment,
      },
    });
  } catch (error) {
    console.error("Error in updateCommentStatus:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Add admin response to comment (admin only)
export const addAdminResponse = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const { response } = req.body;
    const adminUserId = (req as any).user.user_id;

    // Validate input
    if (!response || response.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Response content is required",
      });
    }

    // Check if comment exists
    const existingComment = await CommentModel.findById(commentId);
    if (!existingComment) {
      return res.status(404).json({
        status: "error",
        message: "Comment not found",
      });
    }

    // Add admin response
    const updatedComment = await CommentModel.addAdminResponse(
      commentId,
      response.trim(),
      adminUserId
    );

    // Notify the comment author about the response
    try {
      await NotificationModel.create({
        user_id: existingComment.user_id,
        title: "Admin Response Received",
        message: "An administrator has responded to your comment.",
        type: "info",
        related_entity_type: "comment",
        related_entity_id: commentId,
      });
    } catch (notificationError) {
      console.error("Error creating notification:", notificationError);
      // Continue with the response even if notification fails
    }

    return res.status(200).json({
      status: "success",
      data: {
        comment: updatedComment,
      },
    });
  } catch (error) {
    console.error("Error in addAdminResponse:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Delete comment
export const deleteComment = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;

    // Check if comment exists
    const existingComment = await CommentModel.findById(commentId);
    if (!existingComment) {
      return res.status(404).json({
        status: "error",
        message: "Comment not found",
      });
    }

    // Check if user is authorized to delete this comment
    const userId = (req as any).user.user_id;
    const userRole = (req as any).user.role;

    if (userRole !== "admin" && existingComment.user_id !== userId) {
      return res.status(403).json({
        status: "error",
        message: "You are not authorized to delete this comment",
      });
    }

    // Delete comment
    await CommentModel.delete(commentId);

    return res.status(200).json({
      status: "success",
      data: null,
    });
  } catch (error) {
    console.error("Error in deleteComment:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Helper function to get admin user IDs
async function getAdminUserIds(): Promise<string[]> {
  try {
    const result = await pool.query(
      "SELECT user_id FROM users WHERE role = 'admin'"
    );
    return result.rows.map((row) => row.user_id);
  } catch (error) {
    console.error("Error fetching admin users:", error);
    return [];
  }
}

// Helper function to check if comments table exists
async function checkCommentsTableExists(): Promise<boolean> {
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'comments'
      ) as exists
    `);
    return result.rows[0].exists;
  } catch (error) {
    console.error("Error checking if comments table exists:", error);
    throw error;
  }
}

// Helper function to create comments table
async function createCommentsTable(): Promise<void> {
  try {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS comments (
        comment_id UUID PRIMARY KEY,
        user_id UUID NOT NULL,
        content TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
      CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
      CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);
    `;

    await pool.query(createTableSQL);

    // Update the notifications table constraint if it exists
    const updateNotificationsSQL = `
      DO $$
      BEGIN
          IF EXISTS (
              SELECT 1
              FROM information_schema.table_constraints
              WHERE constraint_name = 'notifications_related_entity_type_check'
              AND table_name = 'notifications'
          ) THEN
              ALTER TABLE notifications DROP CONSTRAINT notifications_related_entity_type_check;

              ALTER TABLE notifications ADD CONSTRAINT notifications_related_entity_type_check
              CHECK (related_entity_type IS NULL OR related_entity_type IN ('review', 'office', 'service', 'user', 'comment'));
          END IF;
      END $$;
    `;

    await pool.query(updateNotificationsSQL);
  } catch (error) {
    console.error("Error creating comments table:", error);
    throw error;
  }
}

import { Request, Response } from "express";
import CommentReplyModel from "../models/commentReply.model";
import CommentModel from "../models/comment.model";
import NotificationModel from "../models/notification.model";

// Create a new reply to a comment
export const createCommentReply = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const user_id = (req as any).user?.user_id;

    if (!user_id) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Reply content is required",
      });
    }

    // Check if the comment exists
    const comment = await CommentModel.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        status: "error",
        message: "Comment not found",
      });
    }

    // Only allow the original comment author to reply
    if (comment.user_id !== user_id) {
      return res.status(403).json({
        status: "error",
        message: "You can only reply to your own comments",
      });
    }

    // Only allow replies if there's an admin response
    if (!comment.admin_response) {
      return res.status(400).json({
        status: "error",
        message: "You can only reply after an admin has responded",
      });
    }

    // Create the reply
    const reply = await CommentReplyModel.create({
      comment_id: commentId,
      user_id,
      content: content.trim(),
    });

    // Notify admin about the user reply
    if (comment.admin_response_by) {
      try {
        await NotificationModel.create({
          user_id: comment.admin_response_by,
          title: "User Reply Received",
          message: "A user has replied to your response on their feedback.",
          type: "info",
          related_entity_type: "comment",
          related_entity_id: commentId,
        });
      } catch (notificationError) {
        console.error("Error creating notification:", notificationError);
      }
    }

    return res.status(201).json({
      status: "success",
      data: {
        reply,
      },
    });
  } catch (error) {
    console.error("Error in createCommentReply:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get replies for a specific comment
export const getCommentReplies = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;

    const replies = await CommentReplyModel.findByCommentId(commentId);

    return res.status(200).json({
      status: "success",
      data: {
        replies,
      },
    });
  } catch (error) {
    console.error("Error in getCommentReplies:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get replies by user
export const getUserCommentReplies = async (req: Request, res: Response) => {
  try {
    const user_id = (req as any).user?.user_id;

    if (!user_id) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    const replies = await CommentReplyModel.findByUserId(user_id);

    return res.status(200).json({
      status: "success",
      data: {
        replies,
      },
    });
  } catch (error) {
    console.error("Error in getUserCommentReplies:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get a specific reply
export const getCommentReplyById = async (req: Request, res: Response) => {
  try {
    const { replyId } = req.params;

    const reply = await CommentReplyModel.findById(replyId);

    if (!reply) {
      return res.status(404).json({
        status: "error",
        message: "Reply not found",
      });
    }

    return res.status(200).json({
      status: "success",
      data: {
        reply,
      },
    });
  } catch (error) {
    console.error("Error in getCommentReplyById:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Update a reply (only by the author)
export const updateCommentReply = async (req: Request, res: Response) => {
  try {
    const { replyId } = req.params;
    const { content } = req.body;
    const user_id = (req as any).user?.user_id;

    if (!user_id) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    // Check if reply exists
    const existingReply = await CommentReplyModel.findById(replyId);
    if (!existingReply) {
      return res.status(404).json({
        status: "error",
        message: "Reply not found",
      });
    }

    // Check if user is the author
    if (existingReply.user_id !== user_id) {
      return res.status(403).json({
        status: "error",
        message: "You can only edit your own replies",
      });
    }

    // Update the reply
    const updatedReply = await CommentReplyModel.update(replyId, { content });

    return res.status(200).json({
      status: "success",
      data: {
        reply: updatedReply,
      },
    });
  } catch (error) {
    console.error("Error in updateCommentReply:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Delete a reply (only by the author or admin)
export const deleteCommentReply = async (req: Request, res: Response) => {
  try {
    const { replyId } = req.params;
    const user_id = (req as any).user?.user_id;
    const user_role = (req as any).user?.role;

    if (!user_id) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    // Check if reply exists
    const existingReply = await CommentReplyModel.findById(replyId);
    if (!existingReply) {
      return res.status(404).json({
        status: "error",
        message: "Reply not found",
      });
    }

    // Check if user is authorized (author or admin)
    if (existingReply.user_id !== user_id && user_role !== "admin") {
      return res.status(403).json({
        status: "error",
        message: "You can only delete your own replies",
      });
    }

    // Delete the reply
    await CommentReplyModel.delete(replyId);

    return res.status(200).json({
      status: "success",
      data: null,
    });
  } catch (error) {
    console.error("Error in deleteCommentReply:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get all replies (admin only)
export const getAllCommentReplies = async (req: Request, res: Response) => {
  try {
    const user_role = (req as any).user?.role;

    if (user_role !== "admin") {
      return res.status(403).json({
        status: "error",
        message: "Admin access required",
      });
    }

    const replies = await CommentReplyModel.getAll();

    return res.status(200).json({
      status: "success",
      data: {
        replies,
      },
    });
  } catch (error) {
    console.error("Error in getAllCommentReplies:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

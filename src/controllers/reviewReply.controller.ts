import { Request, Response } from "express";
import ReviewReplyModel from "../models/reviewReply.model";
import ReviewModel from "../models/review.model";

// Create a new reply to a review
export const createReply = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
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

    // Check if the review exists
    const review = await ReviewModel.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        status: "error",
        message: "Review not found",
      });
    }

    // Create the reply
    const reply = await ReviewReplyModel.create({
      review_id: reviewId,
      user_id,
      content: content.trim(),
    });

    res.status(201).json({
      status: "success",
      message: "Reply created successfully",
      data: {
        reply,
      },
    });
  } catch (error) {
    console.error("Error creating reply:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get all replies for a specific review
export const getRepliesByReview = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;

    // Check if the review exists
    const review = await ReviewModel.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        status: "error",
        message: "Review not found",
      });
    }

    const replies = await ReviewReplyModel.findByReviewId(reviewId);

    res.status(200).json({
      status: "success",
      data: {
        replies,
      },
    });
  } catch (error) {
    console.error("Error fetching replies:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get all replies by a specific user
export const getRepliesByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = (req as any).user?.user_id;
    const userRole = (req as any).user?.role;

    // Check if user can access these replies (own replies or admin/official)
    if (currentUserId !== userId && userRole !== "admin" && userRole !== "official") {
      return res.status(403).json({
        status: "error",
        message: "Access denied",
      });
    }

    const replies = await ReviewReplyModel.findByUserId(userId);

    res.status(200).json({
      status: "success",
      data: {
        replies,
      },
    });
  } catch (error) {
    console.error("Error fetching user replies:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get a specific reply by ID
export const getReplyById = async (req: Request, res: Response) => {
  try {
    const { replyId } = req.params;

    const reply = await ReviewReplyModel.findById(replyId);
    if (!reply) {
      return res.status(404).json({
        status: "error",
        message: "Reply not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        reply,
      },
    });
  } catch (error) {
    console.error("Error fetching reply:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Update a reply (only by the author or admin)
export const updateReply = async (req: Request, res: Response) => {
  try {
    const { replyId } = req.params;
    const { content } = req.body;
    const user_id = (req as any).user?.user_id;
    const userRole = (req as any).user?.role;

    const reply = await ReviewReplyModel.findById(replyId);
    if (!reply) {
      return res.status(404).json({
        status: "error",
        message: "Reply not found",
      });
    }

    // Check if user can update this reply (author or admin)
    if (reply.user_id !== user_id && userRole !== "admin") {
      return res.status(403).json({
        status: "error",
        message: "Access denied",
      });
    }

    const updatedReply = await ReviewReplyModel.update(replyId, { content });

    res.status(200).json({
      status: "success",
      message: "Reply updated successfully",
      data: {
        reply: updatedReply,
      },
    });
  } catch (error) {
    console.error("Error updating reply:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Delete a reply (only by the author or admin)
export const deleteReply = async (req: Request, res: Response) => {
  try {
    const { replyId } = req.params;
    const user_id = (req as any).user?.user_id;
    const userRole = (req as any).user?.role;

    const reply = await ReviewReplyModel.findById(replyId);
    if (!reply) {
      return res.status(404).json({
        status: "error",
        message: "Reply not found",
      });
    }

    // Check if user can delete this reply (author or admin)
    if (reply.user_id !== user_id && userRole !== "admin") {
      return res.status(403).json({
        status: "error",
        message: "Access denied",
      });
    }

    await ReviewReplyModel.delete(replyId);

    res.status(200).json({
      status: "success",
      message: "Reply deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting reply:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get all replies (admin/official only)
export const getAllReplies = async (req: Request, res: Response) => {
  try {
    const replies = await ReviewReplyModel.getAllReplies();

    res.status(200).json({
      status: "success",
      data: {
        replies,
      },
    });
  } catch (error) {
    console.error("Error fetching all replies:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

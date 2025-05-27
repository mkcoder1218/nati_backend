import { Request, Response } from "express";
import ReviewModel from "../models/review.model";
import SentimentLogModel from "../models/sentimentLog.model";
import { analyzeSentiment } from "../services/sentiment.service";
import VoteModel from "../models/vote.model";

// Create a new review
export const createReview = async (req: Request, res: Response) => {
  try {
    const { office_id, rating, comment, is_anonymous } = req.body;

    // Always get the user_id from the authenticated user
    // The is_anonymous flag controls display, not storage
    const user_id = (req as any).user?.user_id;

    if (!user_id) {
      return res.status(401).json({
        status: "error",
        message: "User authentication required",
      });
    }

    // Check daily review limit for all authenticated users
    const dailyReviewCount = await ReviewModel.getDailyReviewCountByUser(
      user_id
    );
    if (dailyReviewCount >= 3) {
      // Calculate hours until reset (next day at midnight)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const hoursUntilReset = Math.ceil(
        (tomorrow.getTime() - new Date().getTime()) / (1000 * 60 * 60)
      );

      return res.status(429).json({
        status: "error",
        message: `You have submitted ${dailyReviewCount} out of 3 reviews today. You can submit more reviews in ${hoursUntilReset} hours when the daily limit resets.`,
        code: "DAILY_LIMIT_EXCEEDED",
        data: {
          currentCount: dailyReviewCount,
          limit: 3,
          hoursUntilReset: hoursUntilReset,
        },
      });
    }

    console.log("Creating review with data:", {
      user_id,
      office_id,
      rating,
      comment: comment ? comment.substring(0, 50) + "..." : null,
      is_anonymous,
    });

    // Create review
    const review = await ReviewModel.create({
      user_id,
      office_id,
      rating,
      comment,
      is_anonymous,
    });

    console.log("Review created successfully:", {
      review_id: review.review_id,
      user_id: review.user_id,
      is_anonymous: review.is_anonymous,
    });

    // Analyze sentiment if comment is provided
    if (comment) {
      const sentimentResult = await analyzeSentiment(comment);

      // Log sentiment analysis result
      await SentimentLogModel.create({
        review_id: review.review_id,
        sentiment: sentimentResult.sentiment,
        category: sentimentResult.category,
        confidence_score: sentimentResult.confidence,
        language: sentimentResult.language,
      });
    }

    return res.status(201).json({
      status: "success",
      data: {
        review,
      },
    });
  } catch (error) {
    console.error("Error in createReview:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get all reviews
export const getAllReviews = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string;
    const includeReplies = req.query.includeReplies === "true";

    let reviews;

    if (status) {
      reviews = await ReviewModel.getByStatus(status, limit, offset);
    } else if (includeReplies) {
      try {
        reviews = await ReviewModel.getAllWithReplies(limit, offset);
      } catch (error: any) {
        // If review_replies table doesn't exist, fallback to basic reviews
        if (error.code === "42P01") {
          console.warn(
            "review_replies table does not exist, falling back to basic reviews"
          );
          reviews = await ReviewModel.getAllWithDetails(limit, offset);
        } else {
          throw error;
        }
      }
    } else {
      reviews = await ReviewModel.getAllWithDetails(limit, offset);
    }

    return res.status(200).json({
      status: "success",
      data: {
        reviews,
        count: reviews.length,
      },
    });
  } catch (error) {
    console.error("Error in getAllReviews:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get reviews by office
export const getReviewsByOffice = async (req: Request, res: Response) => {
  try {
    const { officeId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const includeReplies = req.query.includeReplies === "true";

    let reviews;

    if (includeReplies) {
      try {
        reviews = await ReviewModel.getByOfficeWithReplies(
          officeId,
          limit,
          offset
        );
      } catch (error: any) {
        // If review_replies table doesn't exist, fallback to basic reviews
        if (error.code === "42P01") {
          console.warn(
            "review_replies table does not exist, falling back to basic reviews"
          );
          reviews = await ReviewModel.getByOffice(officeId, limit, offset);
        } else {
          throw error;
        }
      }
    } else {
      reviews = await ReviewModel.getByOffice(officeId, limit, offset);
    }

    return res.status(200).json({
      status: "success",
      data: {
        reviews,
        count: reviews.length,
      },
    });
  } catch (error) {
    console.error("Error in getReviewsByOffice:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get reviews by user
export const getReviewsByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const includeReplies = req.query.includeReplies === "true";

    // Check if user is authorized to access these reviews
    const requestingUserId = (req as any).user.user_id;
    const userRole = (req as any).user.role;

    if (userRole !== "admin" && requestingUserId !== userId) {
      return res.status(403).json({
        status: "error",
        message: "You are not authorized to access these reviews",
      });
    }

    let reviews;

    if (includeReplies) {
      try {
        reviews = await ReviewModel.getByUserWithReplies(userId, limit, offset);
      } catch (error: any) {
        // If review_replies table doesn't exist, fallback to basic reviews
        if (error.code === "42P01") {
          console.warn(
            "review_replies table does not exist, falling back to basic reviews"
          );
          reviews = await ReviewModel.getByUser(userId, limit, offset);
        } else {
          throw error;
        }
      }
    } else {
      reviews = await ReviewModel.getByUser(userId, limit, offset);
    }

    return res.status(200).json({
      status: "success",
      data: {
        reviews,
        count: reviews.length,
      },
    });
  } catch (error) {
    console.error("Error in getReviewsByUser:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get review by ID
export const getReviewById = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;

    const review = await ReviewModel.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        status: "error",
        message: "Review not found",
      });
    }

    // Get sentiment analysis if available
    const sentiment = await SentimentLogModel.findByReviewId(reviewId);

    return res.status(200).json({
      status: "success",
      data: {
        review,
        sentiment: sentiment || null,
      },
    });
  } catch (error) {
    console.error("Error in getReviewById:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Update review
export const updateReview = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment, is_anonymous } = req.body;

    // Check if review exists
    const existingReview = await ReviewModel.findById(reviewId);
    if (!existingReview) {
      return res.status(404).json({
        status: "error",
        message: "Review not found",
      });
    }

    // Check if user is authorized to update this review
    const userId = (req as any).user.user_id;
    const userRole = (req as any).user.role;

    if (userRole !== "admin" && existingReview.user_id !== userId) {
      return res.status(403).json({
        status: "error",
        message: "You are not authorized to update this review",
      });
    }

    // Update review
    const updatedReview = await ReviewModel.update(reviewId, {
      rating,
      comment,
      is_anonymous,
    });

    if (!updatedReview) {
      return res.status(400).json({
        status: "error",
        message: "Failed to update review",
      });
    }

    // Re-analyze sentiment if comment is updated
    if (comment && comment !== existingReview.comment) {
      const sentimentResult = await analyzeSentiment(comment);

      // Get existing sentiment log
      const existingSentiment = await SentimentLogModel.findByReviewId(
        reviewId
      );

      if (existingSentiment) {
        // Update existing sentiment log
        await SentimentLogModel.update(existingSentiment.log_id, {
          sentiment: sentimentResult.sentiment,
          category: sentimentResult.category,
          confidence_score: sentimentResult.confidence,
          language: sentimentResult.language,
        });
      } else {
        // Create new sentiment log
        await SentimentLogModel.create({
          review_id: reviewId,
          sentiment: sentimentResult.sentiment,
          category: sentimentResult.category,
          confidence_score: sentimentResult.confidence,
          language: sentimentResult.language,
        });
      }
    }

    return res.status(200).json({
      status: "success",
      data: {
        review: updatedReview,
      },
    });
  } catch (error) {
    console.error("Error in updateReview:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Update review status (admin/official only)
export const updateReviewStatus = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { status, moderationNote } = req.body;

    // Check if status is valid
    if (
      !["pending", "approved", "flagged", "rejected", "resolved"].includes(
        status
      )
    ) {
      return res.status(400).json({
        status: "error",
        message: "Invalid status",
      });
    }

    // Check if review exists
    const existingReview = await ReviewModel.findById(reviewId);
    if (!existingReview) {
      return res.status(404).json({
        status: "error",
        message: "Review not found",
      });
    }

    // Import NotificationModel here to avoid circular dependencies
    const NotificationModel = require("../models/notification.model").default;

    // If the status is changing from 'flagged' to something else, it's a moderation action
    if (
      existingReview.status === "flagged" &&
      (status === "approved" || status === "rejected" || status === "resolved")
    ) {
      // Create a notification for the review author
      await NotificationModel.createReviewModerationNotification(
        reviewId,
        status as "approved" | "rejected" | "resolved"
      );
    }

    // Update review status
    const updatedReview = await ReviewModel.updateStatus(reviewId, status);

    if (!updatedReview) {
      return res.status(400).json({
        status: "error",
        message: "Failed to update review status",
      });
    }

    return res.status(200).json({
      status: "success",
      data: {
        review: updatedReview,
      },
    });
  } catch (error) {
    console.error("Error in updateReviewStatus:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Delete review
export const deleteReview = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;

    // Check if review exists
    const existingReview = await ReviewModel.findById(reviewId);
    if (!existingReview) {
      return res.status(404).json({
        status: "error",
        message: "Review not found",
      });
    }

    // Check if user is authorized to delete this review
    const userId = (req as any).user.user_id;
    const userRole = (req as any).user.role;

    if (userRole !== "admin" && existingReview.user_id !== userId) {
      return res.status(403).json({
        status: "error",
        message: "You are not authorized to delete this review",
      });
    }

    // Delete review
    const deleted = await ReviewModel.delete(reviewId);

    if (!deleted) {
      return res.status(400).json({
        status: "error",
        message: "Failed to delete review",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteReview:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Flag review (admin only)
export const flagReview = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { reason } = req.body;
    const adminUserId = (req as any).user.user_id;

    // Check if review exists
    const existingReview = await ReviewModel.findById(reviewId);
    if (!existingReview) {
      return res.status(404).json({
        status: "error",
        message: "Review not found",
      });
    }

    // Create a flag vote
    await VoteModel.create({
      user_id: adminUserId,
      review_id: reviewId,
      vote_type: "flag",
    });

    // Update review status to flagged
    const updatedReview = await ReviewModel.updateStatus(reviewId, "flagged");

    return res.status(200).json({
      status: "success",
      data: {
        review: updatedReview,
      },
      message: "Review flagged successfully",
    });
  } catch (error) {
    console.error("Error in flagReview:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Add admin response to review (admin only)
export const addAdminResponse = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { content } = req.body;
    const adminUserId = (req as any).user.user_id;

    // Validate input
    if (!content || content.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Response content is required",
      });
    }

    // Check if review exists
    const existingReview = await ReviewModel.findById(reviewId);
    if (!existingReview) {
      return res.status(404).json({
        status: "error",
        message: "Review not found",
      });
    }

    // Import ReviewReplyModel here to avoid circular dependencies
    const ReviewReplyModel = require("../models/reviewReply.model").default;

    // Create admin response as a reply
    const reply = await ReviewReplyModel.create({
      review_id: reviewId,
      user_id: adminUserId,
      content: content.trim(),
    });

    // Create notification for review author
    const NotificationModel = require("../models/notification.model").default;
    if (existingReview.user_id) {
      try {
        await NotificationModel.create({
          user_id: existingReview.user_id,
          title: "Admin Response Received",
          message: "An administrator has responded to your review.",
          type: "info",
          related_entity_type: "review",
          related_entity_id: reviewId,
        });
      } catch (notificationError) {
        console.error("Error creating notification:", notificationError);
        // Continue with the response even if notification fails
      }
    }

    return res.status(200).json({
      status: "success",
      data: {
        reply,
      },
      message: "Admin response added successfully",
    });
  } catch (error) {
    console.error("Error in addAdminResponse:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get public approved reviews for browsing
export const getPublicReviews = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const sortBy = (req.query.sortBy as string) || "created_at";
    const sortOrder = (req.query.sortOrder as string) || "desc";

    // Get public approved reviews with user and office details
    const reviews = await ReviewModel.getPublicReviews(
      limit,
      offset,
      sortBy,
      sortOrder
    );

    return res.status(200).json({
      status: "success",
      data: {
        reviews,
        count: reviews.length,
      },
    });
  } catch (error) {
    console.error("Error in getPublicReviews:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

import { Request, Response } from "express";
import VoteModel, { VoteCount } from "../models/vote.model";
import ReviewModel from "../models/review.model";

// Vote on a review
export const voteOnReview = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { vote_type } = req.body;
    const userId = (req as any).user.user_id;

    // Check if vote type is valid
    if (!["helpful", "not_helpful", "flag"].includes(vote_type)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid vote type",
      });
    }

    // Check if review exists
    const review = await ReviewModel.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        status: "error",
        message: "Review not found",
      });
    }

    // Create or update vote
    const vote = await VoteModel.create({
      user_id: userId,
      review_id: reviewId,
      vote_type,
    });

    // If vote type is 'flag' and there are multiple flags, update review status
    if (vote_type === "flag") {
      const voteCounts = await VoteModel.getVoteCountsByReview(reviewId);
      const flagCount =
        voteCounts.find((v: VoteCount) => v.vote_type === "flag")?.count || 0;

      // If there are 3 or more flags, mark the review as flagged
      if (flagCount >= 3) {
        await ReviewModel.updateStatus(reviewId, "flagged");

        // Import NotificationModel here to avoid circular dependencies
        const NotificationModel =
          require("../models/notification.model").default;

        // Create a notification for the review author
        await NotificationModel.createReviewFlaggedNotification(
          reviewId,
          flagCount
        );
      }
    }

    return res.status(200).json({
      status: "success",
      data: {
        vote,
      },
    });
  } catch (error) {
    console.error("Error in voteOnReview:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Remove vote from a review
export const removeVote = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const userId = (req as any).user.user_id;

    // Check if vote exists
    const vote = await VoteModel.findByUserAndReview(userId, reviewId);
    if (!vote) {
      return res.status(404).json({
        status: "error",
        message: "Vote not found",
      });
    }

    // Delete vote
    const deleted = await VoteModel.deleteByUserAndReview(userId, reviewId);

    if (!deleted) {
      return res.status(400).json({
        status: "error",
        message: "Failed to remove vote",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Vote removed successfully",
    });
  } catch (error) {
    console.error("Error in removeVote:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get votes for a review
export const getVotesByReview = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;

    // Check if review exists
    const review = await ReviewModel.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        status: "error",
        message: "Review not found",
      });
    }

    // Get votes
    const votes = await VoteModel.getByReview(reviewId);

    // Get vote counts by type
    const voteCounts = await VoteModel.getVoteCountsByReview(reviewId);

    // Check if user is authenticated to get their vote
    let userVote = null;
    if ((req as any).user) {
      const userId = (req as any).user.user_id;
      userVote = await VoteModel.findByUserAndReview(userId, reviewId);
    }

    return res.status(200).json({
      status: "success",
      data: {
        votes,
        counts: voteCounts,
        user_vote: userVote,
      },
    });
  } catch (error) {
    console.error("Error in getVotesByReview:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get flagged reviews
export const getFlaggedReviews = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const reviews = await VoteModel.getFlaggedReviews(limit, offset);

    return res.status(200).json({
      status: "success",
      data: {
        reviews,
        count: reviews.length,
      },
    });
  } catch (error) {
    console.error("Error in getFlaggedReviews:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get user vote statistics
export const getUserVoteStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.user_id;

    // Get user vote statistics
    const stats = await VoteModel.getUserVoteStats(userId);

    return res.status(200).json({
      status: "success",
      data: {
        stats,
      },
    });
  } catch (error) {
    console.error("Error in getUserVoteStats:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get overall vote statistics (admin/official only)
export const getVoteStatistics = async (req: Request, res: Response) => {
  try {
    // Get vote statistics
    const statistics = await VoteModel.getVoteStatistics();

    return res.status(200).json({
      status: "success",
      data: {
        statistics,
      },
    });
  } catch (error) {
    console.error("Error in getVoteStatistics:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get reviews that user has upvoted
export const getUserUpvotedReviews = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.user_id;

    // Get reviews that user has upvoted
    const reviews = await VoteModel.getUserUpvotedReviews(userId);

    return res.status(200).json({
      status: "success",
      data: {
        reviews,
      },
    });
  } catch (error) {
    console.error("Error in getUserUpvotedReviews:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get reviews that user has downvoted
export const getUserDownvotedReviews = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.user_id;

    // Get reviews that user has downvoted
    const reviews = await VoteModel.getUserDownvotedReviews(userId);

    return res.status(200).json({
      status: "success",
      data: {
        reviews,
      },
    });
  } catch (error) {
    console.error("Error in getUserDownvotedReviews:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

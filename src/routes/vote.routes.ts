import express from "express";
import {
  voteOnReview,
  removeVote,
  getVotesByReview,
  getFlaggedReviews,
  getUserVoteStats,
  getVoteStatistics,
  getUserUpvotedReviews,
  getUserDownvotedReviews,
} from "../controllers/vote.controller";
import {
  authenticateJWT,
  optionalAuthenticateJWT,
  isOfficial,
  isAdmin,
} from "../middleware/auth";

const router = express.Router();

// Vote on a review (authenticated users only)
router.post("/review/:reviewId", authenticateJWT, voteOnReview);

// Remove vote from a review (authenticated users only)
router.delete("/review/:reviewId", authenticateJWT, removeVote);

// Get votes for a review (public, but includes user's vote if authenticated)
router.get("/review/:reviewId", optionalAuthenticateJWT, getVotesByReview);

// Get flagged reviews (admin/official only)
router.get("/flagged", authenticateJWT, isOfficial, getFlaggedReviews);

// Get user vote statistics (authenticated users only)
router.get("/user/stats", authenticateJWT, getUserVoteStats);

// Get reviews that user has upvoted (officials/admin only)
router.get(
  "/user/upvoted-reviews",
  authenticateJWT,
  isOfficial,
  getUserUpvotedReviews
);

// Get reviews that user has downvoted (officials/admin only)
router.get(
  "/user/downvoted-reviews",
  authenticateJWT,
  isOfficial,
  getUserDownvotedReviews
);

// Get overall vote statistics (admin/official only)
router.get("/statistics", authenticateJWT, isOfficial, getVoteStatistics);

export default router;

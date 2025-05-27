import express from "express";
import {
  voteOnReview,
  removeVote,
  getVotesByReview,
  getFlaggedReviews,
  getUserVoteStats,
  getVoteStatistics,
} from "../controllers/vote.controller";
import { authenticateJWT, isOfficial, isAdmin } from "../middleware/auth";

const router = express.Router();

// Vote on a review (authenticated users only)
router.post("/review/:reviewId", authenticateJWT, voteOnReview);

// Remove vote from a review (authenticated users only)
router.delete("/review/:reviewId", authenticateJWT, removeVote);

// Get votes for a review (public)
router.get("/review/:reviewId", getVotesByReview);

// Get flagged reviews (admin/official only)
router.get("/flagged", authenticateJWT, isOfficial, getFlaggedReviews);

// Get user vote statistics (authenticated users only)
router.get("/user/stats", authenticateJWT, getUserVoteStats);

// Get overall vote statistics (admin/official only)
router.get("/statistics", authenticateJWT, isOfficial, getVoteStatistics);

export default router;

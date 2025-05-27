import express from "express";
import {
  createReview,
  getAllReviews,
  getReviewsByOffice,
  getReviewsByUser,
  getReviewById,
  updateReview,
  updateReviewStatus,
  deleteReview,
  flagReview,
  addAdminResponse,
  getPublicReviews,
} from "../controllers/review.controller";
import {
  authenticateJWT,
  optionalAuthenticateJWT,
  isAdmin,
  isOfficial,
} from "../middleware/auth";

const router = express.Router();

// Get all reviews (admin/official only)
router.get("/", authenticateJWT, isOfficial, getAllReviews);

// Get public approved reviews (for browsing)
router.get("/public/browse", getPublicReviews);

// Get reviews by office (public)
router.get("/office/:officeId", getReviewsByOffice);

// Get reviews by user (authenticated user or admin)
router.get("/user/:userId", authenticateJWT, getReviewsByUser);

// Get review by ID (public)
router.get("/:reviewId", getReviewById);

// Create a new review (authenticated or anonymous)
router.post("/", optionalAuthenticateJWT, createReview);

// Update review (owner or admin)
router.put("/:reviewId", authenticateJWT, updateReview);

// Update review status (admin/official only)
router.patch(
  "/:reviewId/status",
  authenticateJWT,
  isOfficial,
  updateReviewStatus
);

// Flag review (admin only)
router.patch("/:reviewId/flag", authenticateJWT, isAdmin, flagReview);

// Add admin response to review (admin only)
router.post("/:reviewId/response", authenticateJWT, isAdmin, addAdminResponse);

// Delete review (owner or admin)
router.delete("/:reviewId", authenticateJWT, deleteReview);

export default router;

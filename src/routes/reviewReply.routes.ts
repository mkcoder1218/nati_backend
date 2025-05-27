import express from "express";
import {
  createReply,
  getRepliesByReview,
  getRepliesByUser,
  getReplyById,
  updateReply,
  deleteReply,
  getAllReplies,
} from "../controllers/reviewReply.controller";
import { authenticateJWT, isOfficial } from "../middleware/auth";

const router = express.Router();

// Get all replies (admin/official only)
router.get("/", authenticateJWT, isOfficial, getAllReplies);

// Get replies for a specific review (public)
router.get("/review/:reviewId", getRepliesByReview);

// Get replies by a specific user (authenticated users, own replies or admin/official)
router.get("/user/:userId", authenticateJWT, getRepliesByUser);

// Get a specific reply by ID (public)
router.get("/:replyId", getReplyById);

// Create a new reply to a review (authenticated users only)
router.post("/review/:reviewId", authenticateJWT, createReply);

// Update a reply (author or admin only)
router.put("/:replyId", authenticateJWT, updateReply);

// Delete a reply (author or admin only)
router.delete("/:replyId", authenticateJWT, deleteReply);

export default router;

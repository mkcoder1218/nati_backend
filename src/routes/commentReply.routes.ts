import express from "express";
import {
  createCommentReply,
  getCommentReplies,
  getUserCommentReplies,
  getCommentReplyById,
  updateCommentReply,
  deleteCommentReply,
  getAllCommentReplies,
} from "../controllers/commentReply.controller";
import { authenticateJWT, isAdmin } from "../middleware/auth";

const router = express.Router();

// Create a new reply to a comment (authenticated users only)
router.post("/:commentId/replies", authenticateJWT, createCommentReply);

// Get all replies for a specific comment (public)
router.get("/:commentId/replies", getCommentReplies);

// Get replies by current user (authenticated users only)
router.get("/user/replies", authenticateJWT, getUserCommentReplies);

// Get all replies (admin only)
router.get("/admin/replies", authenticateJWT, isAdmin, getAllCommentReplies);

// Get a specific reply by ID
router.get("/replies/:replyId", getCommentReplyById);

// Update a reply (author only)
router.put("/replies/:replyId", authenticateJWT, updateCommentReply);

// Delete a reply (author or admin)
router.delete("/replies/:replyId", authenticateJWT, deleteCommentReply);

export default router;

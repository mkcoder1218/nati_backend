import express from "express";
import {
  createComment,
  getAllComments,
  getCommentsByUser,
  getCommentById,
  updateComment,
  updateCommentStatus,
  addAdminResponse,
  deleteComment,
} from "../controllers/comment.controller";
import { authenticateJWT, isAdmin, isOwnerOrAdmin } from "../middleware/auth";

const router = express.Router();

// Get all comments (admin only)
router.get("/", authenticateJWT, isAdmin, getAllComments);

// Get comments by the authenticated user
router.get("/user", authenticateJWT, getCommentsByUser);

// Get comment by ID
router.get("/:commentId", authenticateJWT, getCommentById);

// Create a new comment (authenticated users only)
router.post("/", authenticateJWT, createComment);

// Update comment (owner or admin)
router.put("/:commentId", authenticateJWT, updateComment);

// Update comment status (admin only)
router.patch(
  "/:commentId/status",
  authenticateJWT,
  isAdmin,
  updateCommentStatus
);

// Add admin response to comment (admin only)
router.post("/:commentId/response", authenticateJWT, isAdmin, addAdminResponse);

// Delete comment (owner or admin)
router.delete("/:commentId", authenticateJWT, deleteComment);

export default router;

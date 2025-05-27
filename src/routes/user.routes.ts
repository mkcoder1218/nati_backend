import express from "express";
import {
  getAllUsers,
  getUserById,
  updateUser,
  updateUserRole,
  deleteUser,
  getAvailableOfficials,
  assignUserToOffice,
  removeUserFromOffice,
} from "../controllers/user.controller";
import { authenticateJWT, isAdmin, isOwnerOrAdmin } from "../middleware/auth";

const router = express.Router();

// Get all users (admin only)
router.get("/", authenticateJWT, isAdmin, getAllUsers);

// Get available government officials (admin only)
router.get(
  "/officials/available",
  authenticateJWT,
  isAdmin,
  getAvailableOfficials
);

// Get user by ID
router.get("/:userId", authenticateJWT, isOwnerOrAdmin("userId"), getUserById);

// Update user
router.put("/:userId", authenticateJWT, isOwnerOrAdmin("userId"), updateUser);

// Update user role (admin only)
router.patch("/:userId/role", authenticateJWT, isAdmin, updateUserRole);

// Delete user
router.delete(
  "/:userId",
  authenticateJWT,
  isOwnerOrAdmin("userId"),
  deleteUser
);

// Assign user to office (admin only) - single office assignment
router.post("/:userId/office", authenticateJWT, isAdmin, assignUserToOffice);

// Remove user from office (admin only) - unassign from current office
router.delete(
  "/:userId/office",
  authenticateJWT,
  isAdmin,
  removeUserFromOffice
);

export default router;

import express from "express";
import {
  analyzeText,
  getSentimentStats,
  getSentimentLogsBySentiment,
  getSentimentLogsByCategory,
  getSentimentLogsByLanguage,
  getSentimentKeywords,
} from "../controllers/sentiment.controller";
import { authenticateJWT, isOfficial } from "../middleware/auth";

const router = express.Router();

// Analyze text sentiment (public)
router.post("/analyze", analyzeText);

// Get sentiment statistics (admin/official only)
router.get("/stats", authenticateJWT, isOfficial, getSentimentStats);

// Get sentiment logs by sentiment type (admin/official only)
router.get(
  "/sentiment/:sentiment",
  authenticateJWT,
  isOfficial,
  getSentimentLogsBySentiment
);

// Get sentiment logs by category (admin/official only)
router.get(
  "/category/:category",
  authenticateJWT,
  isOfficial,
  getSentimentLogsByCategory
);

// Get sentiment logs by language (admin/official only)
router.get(
  "/language/:language",
  authenticateJWT,
  isOfficial,
  getSentimentLogsByLanguage
);

// Get sentiment keywords from real review data (admin/official only)
router.get("/keywords", authenticateJWT, isOfficial, getSentimentKeywords);

export default router;

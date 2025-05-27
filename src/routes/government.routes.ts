import express from "express";
import {
  getDashboardStats,
  generateReport,
  getTimeSeriesData,
} from "../controllers/government.controller";
import { authenticateJWT, isOfficial } from "../middleware/auth";

const router = express.Router();

// Get dashboard statistics (official/admin only)
router.get("/dashboard/stats", authenticateJWT, isOfficial, getDashboardStats);

// Get time series data for analytics (official/admin only)
router.get(
  "/analytics/timeseries",
  authenticateJWT,
  isOfficial,
  getTimeSeriesData
);

// Generate a report (official/admin only)
router.get("/reports/generate", authenticateJWT, isOfficial, generateReport);

export default router;

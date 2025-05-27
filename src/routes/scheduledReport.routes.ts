import express from "express";
import { authenticateJWT, isOfficial } from "../middleware/auth";
import {
  createScheduledReport,
  getScheduledReports,
  getScheduledReportById,
  updateScheduledReport,
  deleteScheduledReport,
} from "../controllers/scheduledReport.controller";

const router = express.Router();

// Scheduled report management routes (all require official/admin authentication)
router.post("/", authenticateJWT, isOfficial, createScheduledReport);
router.get("/", authenticateJWT, isOfficial, getScheduledReports);
router.get("/:scheduledReportId", authenticateJWT, isOfficial, getScheduledReportById);
router.put("/:scheduledReportId", authenticateJWT, isOfficial, updateScheduledReport);
router.delete("/:scheduledReportId", authenticateJWT, isOfficial, deleteScheduledReport);

export default router;

import { Request, Response } from "express";
import { ScheduledReportService } from "../services/scheduledReport.service";
import { CreateScheduledReportData } from "../models/scheduledReport.model";

interface AuthenticatedRequest extends Request {
  user?: any;
}

// Create a new scheduled report
export const createScheduledReport = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.user_id;
    const userRole = req.user?.role;
    const userOfficeId = req.user?.office_id;

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "User not authenticated",
      });
    }

    const { title, report_type, frequency, office_id, recipients, notes } =
      req.body;

    // Validate required fields
    if (
      !title ||
      !report_type ||
      !frequency ||
      !recipients ||
      recipients.length === 0
    ) {
      return res.status(400).json({
        status: "error",
        message:
          "Missing required fields: title, report_type, frequency, recipients",
      });
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = recipients.filter(
      (email: string) => !emailRegex.test(email)
    );
    if (invalidEmails.length > 0) {
      return res.status(400).json({
        status: "error",
        message: `Invalid email addresses: ${invalidEmails.join(", ")}`,
      });
    }

    // Determine office_id based on user role
    let targetOfficeId = office_id;
    if (userRole === "official" && userOfficeId) {
      // Officials can only create reports for their own office
      targetOfficeId = userOfficeId;
    } else if (userRole === "admin") {
      // Admins can create reports for any office or system-wide
      targetOfficeId = office_id || null;
    } else {
      return res.status(403).json({
        status: "error",
        message: "Insufficient permissions to create scheduled reports",
      });
    }

    // Calculate next run date based on frequency
    const nextRunDate = ScheduledReportService.calculateNextRunDate(frequency);

    const scheduledReportData: CreateScheduledReportData = {
      title,
      report_type,
      frequency,
      office_id: targetOfficeId,
      user_id: userId,
      recipients,
      next_run_date: nextRunDate.toISOString(),
      notes,
    };

    const scheduledReport = await ScheduledReportService.createScheduledReport(
      scheduledReportData
    );

    res.status(201).json({
      status: "success",
      message: "Scheduled report created successfully",
      data: scheduledReport,
    });
  } catch (error) {
    console.error("Error creating scheduled report:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to create scheduled report",
    });
  }
};

// Get all scheduled reports
export const getScheduledReports = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.user_id;
    const userRole = req.user?.role;
    const userOfficeId = req.user?.office_id;

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "User not authenticated",
      });
    }

    let filterUserId: string | undefined;
    let filterOfficeId: string | undefined;

    // Apply filters based on user role
    if (userRole === "official" && userOfficeId) {
      // Officials can only see reports for their office
      filterOfficeId = userOfficeId;
    } else if (userRole === "admin") {
      // Admins can see all reports, but can filter by office_id if provided
      filterOfficeId = req.query.office_id as string;
    } else {
      return res.status(403).json({
        status: "error",
        message: "Insufficient permissions to view scheduled reports",
      });
    }

    const status = req.query.status as string;
    const scheduledReports = await ScheduledReportService.getScheduledReports(
      filterUserId,
      filterOfficeId,
      status
    );

    res.json({
      status: "success",
      data: scheduledReports,
    });
  } catch (error) {
    console.error("Error fetching scheduled reports:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch scheduled reports",
    });
  }
};

// Get scheduled report by ID
export const getScheduledReportById = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { scheduledReportId } = req.params;
    const userId = req.user?.user_id;
    const userRole = req.user?.role;
    const userOfficeId = req.user?.office_id;

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "User not authenticated",
      });
    }

    const scheduledReport = await ScheduledReportService.getScheduledReportById(
      scheduledReportId
    );

    if (!scheduledReport) {
      return res.status(404).json({
        status: "error",
        message: "Scheduled report not found",
      });
    }

    // Check permissions
    if (userRole === "official") {
      if (userOfficeId !== scheduledReport.office_id) {
        return res.status(403).json({
          status: "error",
          message: "Access denied to this scheduled report",
        });
      }
    }
    // Admins can access any scheduled report

    res.json({
      status: "success",
      data: scheduledReport,
    });
  } catch (error) {
    console.error("Error fetching scheduled report:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch scheduled report",
    });
  }
};

// Update scheduled report
export const updateScheduledReport = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { scheduledReportId } = req.params;
    const userId = req.user?.user_id;
    const userRole = req.user?.role;
    const userOfficeId = req.user?.office_id;

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "User not authenticated",
      });
    }

    // First, get the existing scheduled report to check permissions
    const existingReport = await ScheduledReportService.getScheduledReportById(
      scheduledReportId
    );

    if (!existingReport) {
      return res.status(404).json({
        status: "error",
        message: "Scheduled report not found",
      });
    }

    // Check permissions
    if (userRole === "official") {
      if (userOfficeId !== existingReport.office_id) {
        return res.status(403).json({
          status: "error",
          message: "Access denied to update this scheduled report",
        });
      }
    }

    const updateData = req.body;

    // If frequency is being updated, recalculate next run date
    if (
      updateData.frequency &&
      updateData.frequency !== existingReport.frequency
    ) {
      const nextRunDate = ScheduledReportService.calculateNextRunDate(
        updateData.frequency
      );
      updateData.next_run_date = nextRunDate.toISOString();
    }

    // Validate email addresses if recipients are being updated
    if (updateData.recipients && Array.isArray(updateData.recipients)) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = updateData.recipients.filter(
        (email: string) => !emailRegex.test(email)
      );
      if (invalidEmails.length > 0) {
        return res.status(400).json({
          status: "error",
          message: `Invalid email addresses: ${invalidEmails.join(", ")}`,
        });
      }
    }

    const updatedReport = await ScheduledReportService.updateScheduledReport(
      scheduledReportId,
      updateData
    );

    if (!updatedReport) {
      return res.status(404).json({
        status: "error",
        message: "Failed to update scheduled report",
      });
    }

    res.json({
      status: "success",
      message: "Scheduled report updated successfully",
      data: updatedReport,
    });
  } catch (error) {
    console.error("Error updating scheduled report:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to update scheduled report",
    });
  }
};

// Delete scheduled report
export const deleteScheduledReport = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { scheduledReportId } = req.params;
    const userId = req.user?.user_id;
    const userRole = req.user?.role;
    const userOfficeId = req.user?.office_id;

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "User not authenticated",
      });
    }

    // First, get the existing scheduled report to check permissions
    const existingReport = await ScheduledReportService.getScheduledReportById(
      scheduledReportId
    );

    if (!existingReport) {
      return res.status(404).json({
        status: "error",
        message: "Scheduled report not found",
      });
    }

    // Check permissions
    if (userRole === "official") {
      if (userOfficeId !== existingReport.office_id) {
        return res.status(403).json({
          status: "error",
          message: "Access denied to delete this scheduled report",
        });
      }
    }

    const deleted = await ScheduledReportService.deleteScheduledReport(
      scheduledReportId
    );

    if (!deleted) {
      return res.status(404).json({
        status: "error",
        message: "Failed to delete scheduled report",
      });
    }

    res.json({
      status: "success",
      message: "Scheduled report deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting scheduled report:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to delete scheduled report",
    });
  }
};

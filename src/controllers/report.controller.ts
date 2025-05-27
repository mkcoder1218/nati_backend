import { Request, Response } from 'express';
import { ReportService } from '../services/report.service';
import { AuthenticatedRequest } from '../middleware/auth';

// Get all reports for the authenticated user
export const getReports = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const userRole = req.user?.role;
    const userOfficeId = req.user?.office_id;

    if (!userId || !userRole) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    const reports = await ReportService.getReportsByUser(userId, userRole, userOfficeId);

    // Format file sizes for display
    const formattedReports = reports.map(report => ({
      ...report,
      file_size_formatted: report.file_size ? ReportService.formatFileSize(report.file_size) : 'Unknown'
    }));

    res.status(200).json({
      status: 'success',
      data: formattedReports
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch reports'
    });
  }
};

// Get a specific report by ID
export const getReportById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reportId } = req.params;
    const userId = req.user?.user_id;
    const userRole = req.user?.role;
    const userOfficeId = req.user?.office_id;

    if (!userId || !userRole) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    const report = await ReportService.getReportById(reportId, userId, userRole, userOfficeId);

    if (!report) {
      return res.status(404).json({
        status: 'error',
        message: 'Report not found or access denied'
      });
    }

    // Format file size for display
    const formattedReport = {
      ...report,
      file_size_formatted: report.file_size ? ReportService.formatFileSize(report.file_size) : 'Unknown'
    };

    res.status(200).json({
      status: 'success',
      data: formattedReport
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch report'
    });
  }
};

// Delete a report
export const deleteReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reportId } = req.params;
    const userId = req.user?.user_id;
    const userRole = req.user?.role;
    const userOfficeId = req.user?.office_id;

    if (!userId || !userRole) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    const success = await ReportService.deleteReport(reportId, userId, userRole, userOfficeId);

    if (!success) {
      return res.status(404).json({
        status: 'error',
        message: 'Report not found or access denied'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete report'
    });
  }
};

// Update report status (mainly used internally)
export const updateReportStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reportId } = req.params;
    const { status, file_size } = req.body;
    const userId = req.user?.user_id;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    // Only allow admins and officials to update report status
    if (userRole !== 'admin' && userRole !== 'official') {
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions'
      });
    }

    const updatedReport = await ReportService.updateReport(reportId, {
      status,
      file_size
    });

    if (!updatedReport) {
      return res.status(404).json({
        status: 'error',
        message: 'Report not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: updatedReport
    });
  } catch (error) {
    console.error('Error updating report status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update report status'
    });
  }
};

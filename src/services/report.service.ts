import pool from "../config/database";
import {
  Report,
  CreateReportData,
  UpdateReportData,
} from "../models/report.model";
import fs from "fs-extra";
import path from "path";

export class ReportService {
  // Create a new report record
  static async createReport(data: CreateReportData): Promise<Report> {
    const query = `
      INSERT INTO reports (
        title, filename, file_path, file_size, format, report_type,
        office_id, user_id, start_date, end_date, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      data.title,
      data.filename,
      data.file_path,
      data.file_size || null,
      data.format,
      data.report_type,
      data.office_id || null,
      data.user_id,
      data.start_date || null,
      data.end_date || null,
      data.status || "generating",
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Get all reports for a user (with optional office filtering for officials)
  static async getReportsByUser(
    userId: string,
    userRole: string,
    userOfficeId?: string
  ): Promise<Report[]> {
    let query = `
      SELECT
        r.*,
        o.name as office_name,
        u.full_name as user_name
      FROM reports r
      LEFT JOIN offices o ON r.office_id = o.office_id
      LEFT JOIN users u ON r.user_id = u.user_id
      WHERE 1=1
    `;

    const values: any[] = [];
    let paramCount = 0;

    // Filter based on user role
    if (userRole === "admin") {
      // Admin can see all reports
    } else if (userRole === "official") {
      // Officials can only see reports for their office or reports they created
      query += ` AND (r.user_id = $${++paramCount} OR r.office_id = $${++paramCount})`;
      values.push(userId, userOfficeId);
    } else {
      // Citizens can only see their own reports
      query += ` AND r.user_id = $${++paramCount}`;
      values.push(userId);
    }

    query += ` ORDER BY r.created_at DESC`;

    const result = await pool.query(query, values);
    return result.rows;
  }

  // Get a specific report by ID
  static async getReportById(
    reportId: string,
    userId: string,
    userRole: string,
    userOfficeId?: string
  ): Promise<Report | null> {
    let query = `
      SELECT
        r.*,
        o.name as office_name,
        u.full_name as user_name
      FROM reports r
      LEFT JOIN offices o ON r.office_id = o.office_id
      LEFT JOIN users u ON r.user_id = u.user_id
      WHERE r.report_id = $1
    `;

    const values: any[] = [reportId];
    let paramCount = 1;

    // Add permission checks based on user role
    if (userRole === "admin") {
      // Admin can access any report
    } else if (userRole === "official") {
      // Officials can access reports for their office or reports they created
      query += ` AND (r.user_id = $${++paramCount} OR r.office_id = $${++paramCount})`;
      values.push(userId, userOfficeId);
    } else {
      // Citizens can only access their own reports
      query += ` AND r.user_id = $${++paramCount}`;
      values.push(userId);
    }

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  // Update a report
  static async updateReport(
    reportId: string,
    data: UpdateReportData
  ): Promise<Report | null> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (data.title !== undefined) {
      updateFields.push(`title = $${++paramCount}`);
      values.push(data.title);
    }
    if (data.file_size !== undefined) {
      updateFields.push(`file_size = $${++paramCount}`);
      values.push(data.file_size);
    }
    if (data.status !== undefined) {
      updateFields.push(`status = $${++paramCount}`);
      values.push(data.status);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updateFields.length === 1) {
      // Only updated_at
      return null;
    }

    const query = `
      UPDATE reports
      SET ${updateFields.join(", ")}
      WHERE report_id = $${++paramCount}
      RETURNING *
    `;
    values.push(reportId);

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  // Delete a report (both database record and file)
  static async deleteReport(
    reportId: string,
    userId: string,
    userRole: string,
    userOfficeId?: string
  ): Promise<boolean> {
    // First, get the report to check permissions and get file path
    const report = await this.getReportById(
      reportId,
      userId,
      userRole,
      userOfficeId
    );
    if (!report) {
      return false;
    }

    // Delete the file if it exists
    try {
      if (fs.existsSync(report.file_path)) {
        await fs.unlink(report.file_path);
      }
    } catch (error) {
      console.error("Error deleting report file:", error);
      // Continue with database deletion even if file deletion fails
    }

    // Delete the database record
    const query = "DELETE FROM reports WHERE report_id = $1";
    const result = await pool.query(query, [reportId]);

    return (result.rowCount || 0) > 0;
  }

  // Get file size for a given file path
  static async getFileSize(filePath: string): Promise<number | null> {
    try {
      if (fs.existsSync(filePath)) {
        const stats = await fs.stat(filePath);
        return stats.size;
      }
      return null;
    } catch (error) {
      console.error("Error getting file size:", error);
      return null;
    }
  }

  // Format file size for display
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}

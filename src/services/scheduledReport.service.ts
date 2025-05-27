import pool from "../config/database";
import {
  ScheduledReport,
  CreateScheduledReportData,
  UpdateScheduledReportData,
} from "../models/scheduledReport.model";

export class ScheduledReportService {
  // Create a new scheduled report
  static async createScheduledReport(
    data: CreateScheduledReportData
  ): Promise<ScheduledReport> {
    const query = `
      INSERT INTO scheduled_reports (
        title, report_type, frequency, office_id, user_id, recipients,
        next_run_date, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      data.title,
      data.report_type,
      data.frequency,
      data.office_id || null,
      data.user_id,
      data.recipients,
      data.next_run_date,
      data.status || "active",
      data.notes || null,
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Get all scheduled reports with optional filtering
  static async getScheduledReports(
    userId?: string,
    officeId?: string,
    status?: string
  ): Promise<ScheduledReport[]> {
    let query = `
      SELECT
        sr.*,
        o.name as office_name,
        u.full_name as user_name
      FROM scheduled_reports sr
      LEFT JOIN offices o ON sr.office_id = o.office_id
      LEFT JOIN users u ON sr.user_id = u.user_id
      WHERE 1=1
    `;
    const values: any[] = [];
    let paramCount = 0;

    if (userId) {
      paramCount++;
      query += ` AND sr.user_id = $${paramCount}`;
      values.push(userId);
    }

    if (officeId) {
      paramCount++;
      query += ` AND sr.office_id = $${paramCount}`;
      values.push(officeId);
    }

    if (status) {
      paramCount++;
      query += ` AND sr.status = $${paramCount}`;
      values.push(status);
    }

    query += ` ORDER BY sr.created_at DESC`;

    const result = await pool.query(query, values);
    return result.rows;
  }

  // Get scheduled report by ID
  static async getScheduledReportById(
    scheduledReportId: string
  ): Promise<ScheduledReport | null> {
    const query = `
      SELECT
        sr.*,
        o.name as office_name,
        u.full_name as user_name
      FROM scheduled_reports sr
      LEFT JOIN offices o ON sr.office_id = o.office_id
      LEFT JOIN users u ON sr.user_id = u.user_id
      WHERE sr.scheduled_report_id = $1
    `;

    const result = await pool.query(query, [scheduledReportId]);
    return result.rows[0] || null;
  }

  // Update scheduled report
  static async updateScheduledReport(
    scheduledReportId: string,
    data: UpdateScheduledReportData
  ): Promise<ScheduledReport | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    // Build dynamic update query
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        paramCount++;
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      throw new Error("No fields to update");
    }

    // Add updated_at timestamp
    paramCount++;
    fields.push(`updated_at = $${paramCount}`);
    values.push(new Date().toISOString());

    // Add the ID parameter
    paramCount++;
    values.push(scheduledReportId);

    const query = `
      UPDATE scheduled_reports
      SET ${fields.join(", ")}
      WHERE scheduled_report_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  // Delete scheduled report
  static async deleteScheduledReport(
    scheduledReportId: string
  ): Promise<boolean> {
    const query = `DELETE FROM scheduled_reports WHERE scheduled_report_id = $1`;
    const result = await pool.query(query, [scheduledReportId]);
    return (result.rowCount ?? 0) > 0;
  }

  // Get scheduled reports that are due to run
  static async getDueScheduledReports(): Promise<ScheduledReport[]> {
    const query = `
      SELECT
        sr.*,
        o.name as office_name,
        u.full_name as user_name
      FROM scheduled_reports sr
      LEFT JOIN offices o ON sr.office_id = o.office_id
      LEFT JOIN users u ON sr.user_id = u.user_id
      WHERE sr.status = 'active'
        AND sr.next_run_date <= NOW()
      ORDER BY sr.next_run_date ASC
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  // Calculate next run date based on frequency
  static calculateNextRunDate(frequency: string, fromDate?: Date): Date {
    const baseDate = fromDate || new Date();
    const nextRun = new Date(baseDate);

    switch (frequency) {
      case "daily":
        nextRun.setDate(nextRun.getDate() + 1);
        break;
      case "weekly":
        nextRun.setDate(nextRun.getDate() + 7);
        break;
      case "monthly":
        nextRun.setMonth(nextRun.getMonth() + 1);
        break;
      case "quarterly":
        nextRun.setMonth(nextRun.getMonth() + 3);
        break;
      default:
        throw new Error(`Invalid frequency: ${frequency}`);
    }

    return nextRun;
  }
}

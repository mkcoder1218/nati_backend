import pool from "../config/database";
import { v4 as uuidv4 } from "uuid";

export interface ServiceGuide {
  guide_id: string;
  office_id: string;
  title: string;
  content: string;
  language: "amharic" | "english";
  created_at: Date;
  updated_at: Date;
}

export interface ServiceGuideInput {
  office_id: string;
  title: string;
  content: string;
  language: "amharic" | "english";
}

class ServiceGuideModel {
  async create(guideData: ServiceGuideInput): Promise<ServiceGuide> {
    const { office_id, title, content, language } = guideData;

    try {
      // First verify that the office exists
      const officeCheck = await pool.query(
        "SELECT office_id FROM offices WHERE office_id = $1",
        [office_id]
      );

      if (officeCheck.rows.length === 0) {
        throw new Error(`Office with ID ${office_id} does not exist`);
      }

      console.log("Creating service guide for office:", office_id);

      const result = await pool.query(
        `INSERT INTO service_guides (
          guide_id,
          office_id,
          title,
          content,
          language,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING *`,
        [uuidv4(), office_id, title, content, language]
      );

      console.log(
        "Service guide created in database:",
        result.rows[0].guide_id
      );
      return result.rows[0];
    } catch (error) {
      console.error("Database error in ServiceGuideModel.create:", error);
      throw error;
    }
  }

  async findById(guideId: string): Promise<ServiceGuide | null> {
    const result = await pool.query(
      "SELECT * FROM service_guides WHERE guide_id = $1",
      [guideId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async update(
    guideId: string,
    guideData: Partial<ServiceGuideInput>
  ): Promise<ServiceGuide | null> {
    // Start building the query
    let query = "UPDATE service_guides SET ";
    const values: any[] = [];
    let valueIndex = 1;

    // Add each field to update
    const updateFields: string[] = [];

    if (guideData.title) {
      updateFields.push(`title = $${valueIndex++}`);
      values.push(guideData.title);
    }

    if (guideData.content) {
      updateFields.push(`content = $${valueIndex++}`);
      values.push(guideData.content);
    }

    if (guideData.language) {
      updateFields.push(`language = $${valueIndex++}`);
      values.push(guideData.language);
    }

    // Always update the updated_at timestamp
    updateFields.push("updated_at = NOW()");

    // Complete the query
    query += updateFields.join(", ");
    query += ` WHERE guide_id = $${valueIndex} RETURNING *`;
    values.push(guideId);

    const result = await pool.query(query, values);

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async delete(guideId: string): Promise<boolean> {
    const result = await pool.query(
      "DELETE FROM service_guides WHERE guide_id = $1 RETURNING *",
      [guideId]
    );

    return result.rows.length > 0;
  }

  async getByOffice(
    officeId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<ServiceGuide[]> {
    const result = await pool.query(
      `SELECT * FROM service_guides
       WHERE office_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [officeId, limit, offset]
    );

    return result.rows;
  }

  async getByLanguage(
    language: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<ServiceGuide[]> {
    const result = await pool.query(
      `SELECT * FROM service_guides
       WHERE language = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [language, limit, offset]
    );

    return result.rows;
  }

  async getByOfficeAndLanguage(
    officeId: string,
    language: string
  ): Promise<ServiceGuide[]> {
    const result = await pool.query(
      `SELECT * FROM service_guides
       WHERE office_id = $1 AND language = $2
       ORDER BY created_at DESC`,
      [officeId, language]
    );

    return result.rows;
  }

  async search(
    query: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<ServiceGuide[]> {
    const result = await pool.query(
      `SELECT * FROM service_guides
       WHERE title ILIKE $1 OR content ILIKE $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [`%${query}%`, limit, offset]
    );

    return result.rows;
  }

  async getAll(
    limit: number = 100,
    offset: number = 0
  ): Promise<ServiceGuide[]> {
    const result = await pool.query(
      `SELECT * FROM service_guides
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows;
  }
}

export default new ServiceGuideModel();

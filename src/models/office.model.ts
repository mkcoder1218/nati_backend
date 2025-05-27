import pool from "../config/database";
import { v4 as uuidv4 } from "uuid";

export interface Office {
  office_id: string;
  name: string;
  type: "kebele" | "woreda" | "municipal" | "regional" | "federal";
  latitude: number;
  longitude: number;
  address: string;
  contact_info: string;
  operating_hours: string;
  parent_office_id?: string;
  upvote_count?: number;
  downvote_count?: number;
}

export interface OfficeInput {
  name: string;
  type: "kebele" | "woreda" | "municipal" | "regional" | "federal";
  latitude: number;
  longitude: number;
  address: string;
  contact_info: string;
  operating_hours: string;
  parent_office_id?: string;
}

class OfficeModel {
  async create(officeData: OfficeInput): Promise<Office> {
    const {
      name,
      type,
      latitude,
      longitude,
      address,
      contact_info,
      operating_hours,
      parent_office_id,
    } = officeData;

    const result = await pool.query(
      `INSERT INTO offices (
        office_id,
        name,
        type,
        latitude,
        longitude,
        address,
        contact_info,
        operating_hours,
        parent_office_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        uuidv4(),
        name,
        type,
        latitude,
        longitude,
        address,
        contact_info,
        operating_hours,
        parent_office_id,
      ]
    );

    return result.rows[0];
  }

  async findById(officeId: string): Promise<Office | null> {
    const result = await pool.query(
      `SELECT
        office_id,
        name,
        type,
        longitude,
        latitude,
        address,
        contact_info,
        operating_hours,
        parent_office_id,
        upvote_count,
        downvote_count
      FROM offices
      WHERE office_id = $1`,
      [officeId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async update(
    officeId: string,
    officeData: Partial<OfficeInput>
  ): Promise<Office | null> {
    // Start building the query
    let query = "UPDATE offices SET ";
    const values: any[] = [];
    let valueIndex = 1;

    // Add each field to update
    const updateFields: string[] = [];

    if (officeData.name) {
      updateFields.push(`name = $${valueIndex++}`);
      values.push(officeData.name);
    }

    if (officeData.type) {
      updateFields.push(`type = $${valueIndex++}`);
      values.push(officeData.type);
    }

    if (
      officeData.latitude !== undefined &&
      officeData.longitude !== undefined
    ) {
      updateFields.push(`latitude = $${valueIndex++}`);
      values.push(officeData.latitude);

      updateFields.push(`longitude = $${valueIndex++}`);
      values.push(officeData.longitude);
    }

    if (officeData.address) {
      updateFields.push(`address = $${valueIndex++}`);
      values.push(officeData.address);
    }

    if (officeData.contact_info) {
      updateFields.push(`contact_info = $${valueIndex++}`);
      values.push(officeData.contact_info);
    }

    if (officeData.operating_hours) {
      updateFields.push(`operating_hours = $${valueIndex++}`);
      values.push(officeData.operating_hours);
    }

    if (officeData.parent_office_id !== undefined) {
      updateFields.push(`parent_office_id = $${valueIndex++}`);
      values.push(officeData.parent_office_id);
    }

    // Complete the query
    query += updateFields.join(", ");
    query += ` WHERE office_id = $${valueIndex} RETURNING *`;
    values.push(officeId);

    const result = await pool.query(query, values);

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async delete(officeId: string): Promise<boolean> {
    const result = await pool.query(
      "DELETE FROM offices WHERE office_id = $1 RETURNING *",
      [officeId]
    );

    return result.rows.length > 0;
  }

  async getAll(limit: number = 100, offset: number = 0): Promise<Office[]> {
    const result = await pool.query(
      `SELECT
        office_id,
        name,
        type,
        longitude,
        latitude,
        address,
        contact_info,
        operating_hours,
        parent_office_id,
        upvote_count,
        downvote_count
      FROM offices
      ORDER BY name
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows;
  }

  async getByType(
    type: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<Office[]> {
    const result = await pool.query(
      `SELECT
        office_id,
        name,
        type,
        longitude,
        latitude,
        address,
        contact_info,
        operating_hours,
        parent_office_id,
        upvote_count,
        downvote_count
      FROM offices
      WHERE type = $1
      ORDER BY name
      LIMIT $2 OFFSET $3`,
      [type, limit, offset]
    );

    return result.rows;
  }

  async getByParent(
    parentId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<Office[]> {
    const result = await pool.query(
      `SELECT
        office_id,
        name,
        type,
        longitude,
        latitude,
        address,
        contact_info,
        operating_hours,
        parent_office_id,
        upvote_count,
        downvote_count
      FROM offices
      WHERE parent_office_id = $1
      ORDER BY name
      LIMIT $2 OFFSET $3`,
      [parentId, limit, offset]
    );

    return result.rows;
  }
}

export default new OfficeModel();

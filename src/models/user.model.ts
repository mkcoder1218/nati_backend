import pool from "../config/database";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

export interface User {
  user_id: string;
  email: string;
  password: string;
  role: "citizen" | "official" | "admin";
  full_name: string;
  phone_number?: string;
  office_id?: string; // Links government officials to their assigned office. NULL for citizens and admins.
  created_at: Date;
  last_login?: Date;
}

export interface UserInput {
  email: string;
  password: string;
  role?: "citizen" | "official" | "admin";
  full_name: string;
  phone_number?: string;
  office_id?: string;
}

class UserModel {
  async create(userData: UserInput): Promise<User> {
    const {
      email,
      password,
      role = "citizen",
      full_name,
      phone_number,
      office_id,
    } = userData;

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO users (user_id, email, password, role, full_name, phone_number, office_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [
        uuidv4(),
        email,
        hashedPassword,
        role,
        full_name,
        phone_number,
        office_id,
      ]
    );

    return result.rows[0];
  }

  async findById(userId: string): Promise<User | null> {
    const result = await pool.query("SELECT * FROM users WHERE user_id = $1", [
      userId,
    ]);

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async findByPhone(phoneNumber: string): Promise<User | null> {
    const result = await pool.query(
      "SELECT * FROM users WHERE phone_number = $1",
      [phoneNumber]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async update(
    userId: string,
    userData: Partial<UserInput>
  ): Promise<User | null> {
    // Start building the query
    let query = "UPDATE users SET ";
    const values: any[] = [];
    let valueIndex = 1;

    // Add each field to update
    const updateFields: string[] = [];

    if (userData.email) {
      updateFields.push(`email = $${valueIndex++}`);
      values.push(userData.email);
    }

    if (userData.password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      updateFields.push(`password = $${valueIndex++}`);
      values.push(hashedPassword);
    }

    if (userData.role) {
      updateFields.push(`role = $${valueIndex++}`);
      values.push(userData.role);
    }

    if (userData.full_name) {
      updateFields.push(`full_name = $${valueIndex++}`);
      values.push(userData.full_name);
    }

    if (userData.phone_number !== undefined) {
      updateFields.push(`phone_number = $${valueIndex++}`);
      values.push(userData.phone_number);
    }

    if (userData.office_id !== undefined) {
      updateFields.push(`office_id = $${valueIndex++}`);
      values.push(userData.office_id);
    }

    // Add updated_at field
    updateFields.push(`last_login = NOW()`);

    // Complete the query
    query += updateFields.join(", ");
    query += ` WHERE user_id = $${valueIndex} RETURNING *`;
    values.push(userId);

    const result = await pool.query(query, values);

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async delete(userId: string): Promise<boolean> {
    const result = await pool.query(
      "DELETE FROM users WHERE user_id = $1 RETURNING *",
      [userId]
    );

    return result.rows.length > 0;
  }

  async comparePassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  async updateLastLogin(userId: string): Promise<void> {
    await pool.query("UPDATE users SET last_login = NOW() WHERE user_id = $1", [
      userId,
    ]);
  }

  async getAll(limit: number = 100, offset: number = 0): Promise<User[]> {
    const result = await pool.query(
      "SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2",
      [limit, offset]
    );

    return result.rows;
  }

  async findByOfficeId(officeId: string): Promise<User[]> {
    const result = await pool.query(
      "SELECT * FROM users WHERE office_id = $1 AND role = 'official'",
      [officeId]
    );

    return result.rows;
  }

  // Simple office assignment methods
  async assignOfficialToOffice(
    userId: string,
    officeId: string
  ): Promise<User | null> {
    const result = await pool.query(
      "UPDATE users SET office_id = $1 WHERE user_id = $2 AND role = 'official' RETURNING *",
      [officeId, userId]
    );

    return result.rows[0] || null;
  }

  async unassignOfficialFromOffice(userId: string): Promise<User | null> {
    const result = await pool.query(
      "UPDATE users SET office_id = NULL WHERE user_id = $1 AND role = 'official' RETURNING *",
      [userId]
    );

    return result.rows[0] || null;
  }

  async findWithOfficeInfo(
    userId: string
  ): Promise<(User & { office_name?: string }) | null> {
    const result = await pool.query(
      `SELECT u.*, o.name as office_name
       FROM users u
       LEFT JOIN offices o ON u.office_id = o.office_id
       WHERE u.user_id = $1`,
      [userId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async getAvailableOfficials(): Promise<User[]> {
    const result = await pool.query(
      "SELECT * FROM users WHERE role = 'official' ORDER BY full_name ASC"
    );

    return result.rows;
  }
}

export default new UserModel();

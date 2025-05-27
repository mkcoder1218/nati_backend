import pool from "../config/database";
import { v4 as uuidv4 } from "uuid";

export interface ReviewReply {
  reply_id: string;
  review_id: string;
  user_id: string;
  content: string;
  created_at: Date;
  updated_at: Date;
}

export interface ReviewReplyInput {
  review_id: string;
  user_id: string;
  content: string;
}

export interface ReviewReplyWithUser extends ReviewReply {
  user_name?: string;
  user_role?: string;
}

class ReviewReplyModel {
  async create(replyData: ReviewReplyInput): Promise<ReviewReply> {
    const { review_id, user_id, content } = replyData;

    const result = await pool.query(
      `INSERT INTO review_replies (
        reply_id,
        review_id,
        user_id,
        content,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *`,
      [uuidv4(), review_id, user_id, content]
    );

    return result.rows[0];
  }

  async findById(replyId: string): Promise<ReviewReply | null> {
    const result = await pool.query(
      "SELECT * FROM review_replies WHERE reply_id = $1",
      [replyId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async findByReviewId(reviewId: string): Promise<ReviewReplyWithUser[]> {
    const result = await pool.query(
      `SELECT
        rr.*,
        u.name as user_name,
        u.role as user_role
      FROM review_replies rr
      LEFT JOIN users u ON rr.user_id = u.user_id
      WHERE rr.review_id = $1
      ORDER BY rr.created_at ASC`,
      [reviewId]
    );

    return result.rows;
  }

  async findByUserId(userId: string): Promise<ReviewReplyWithUser[]> {
    const result = await pool.query(
      `SELECT
        rr.*,
        u.name as user_name,
        u.role as user_role
      FROM review_replies rr
      LEFT JOIN users u ON rr.user_id = u.user_id
      WHERE rr.user_id = $1
      ORDER BY rr.created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  async update(
    replyId: string,
    updateData: Partial<ReviewReplyInput>
  ): Promise<ReviewReply | null> {
    const { content } = updateData;

    const result = await pool.query(
      `UPDATE review_replies
       SET content = COALESCE($1, content),
           updated_at = NOW()
       WHERE reply_id = $2
       RETURNING *`,
      [content, replyId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async delete(replyId: string): Promise<boolean> {
    const result = await pool.query(
      "DELETE FROM review_replies WHERE reply_id = $1",
      [replyId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async getAllReplies(): Promise<ReviewReplyWithUser[]> {
    const result = await pool.query(
      `SELECT
        rr.*,
        u.name as user_name,
        u.role as user_role
      FROM review_replies rr
      LEFT JOIN users u ON rr.user_id = u.user_id
      ORDER BY rr.created_at DESC`
    );

    return result.rows;
  }
}

export default new ReviewReplyModel();

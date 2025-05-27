import pool from "../config/database";
import { v4 as uuidv4 } from "uuid";

export interface CommentReply {
  reply_id: string;
  comment_id: string;
  user_id: string;
  content: string;
  created_at: Date;
  updated_at: Date;
}

export interface CommentReplyInput {
  comment_id: string;
  user_id: string;
  content: string;
}

export interface CommentReplyWithUser extends CommentReply {
  user_name?: string;
  user_role?: string;
}

class CommentReplyModel {
  async create(replyData: CommentReplyInput): Promise<CommentReply> {
    const { comment_id, user_id, content } = replyData;

    const result = await pool.query(
      `INSERT INTO comment_replies (
        reply_id,
        comment_id,
        user_id,
        content,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *`,
      [uuidv4(), comment_id, user_id, content]
    );

    return result.rows[0];
  }

  async findById(replyId: string): Promise<CommentReply | null> {
    const result = await pool.query(
      "SELECT * FROM comment_replies WHERE reply_id = $1",
      [replyId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async findByCommentId(commentId: string): Promise<CommentReplyWithUser[]> {
    const result = await pool.query(
      `SELECT cr.*, u.full_name as user_name, u.role as user_role
       FROM comment_replies cr
       LEFT JOIN users u ON cr.user_id = u.user_id
       WHERE cr.comment_id = $1
       ORDER BY cr.created_at ASC`,
      [commentId]
    );

    return result.rows;
  }

  async findByUserId(userId: string): Promise<CommentReplyWithUser[]> {
    const result = await pool.query(
      `SELECT cr.*, u.full_name as user_name, u.role as user_role
       FROM comment_replies cr
       LEFT JOIN users u ON cr.user_id = u.user_id
       WHERE cr.user_id = $1
       ORDER BY cr.created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  async update(replyId: string, updateData: { content?: string }): Promise<CommentReply | null> {
    const { content } = updateData;

    const result = await pool.query(
      `UPDATE comment_replies 
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
      "DELETE FROM comment_replies WHERE reply_id = $1",
      [replyId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async getAll(): Promise<CommentReplyWithUser[]> {
    const result = await pool.query(
      `SELECT cr.*, u.full_name as user_name, u.role as user_role
       FROM comment_replies cr
       LEFT JOIN users u ON cr.user_id = u.user_id
       ORDER BY cr.created_at DESC`
    );

    return result.rows;
  }

  async getCount(): Promise<number> {
    const result = await pool.query(
      "SELECT COUNT(*) as count FROM comment_replies"
    );

    return parseInt(result.rows[0].count);
  }
}

export default new CommentReplyModel();

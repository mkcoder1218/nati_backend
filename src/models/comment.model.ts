import pool from "../config/database";
import { v4 as uuidv4 } from "uuid";

export interface Comment {
  comment_id: string;
  user_id: string;
  content: string;
  status: "pending" | "approved" | "rejected";
  admin_response?: string;
  admin_response_by?: string;
  admin_response_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CommentInput {
  user_id: string;
  content: string;
}

export interface CommentWithUser extends Comment {
  user_name?: string;
  user_role?: string;
  admin_name?: string;
  replies?: CommentReplyWithUser[];
}

export interface CommentReplyWithUser {
  reply_id: string;
  comment_id: string;
  user_id: string;
  content: string;
  created_at: Date;
  updated_at: Date;
  user_name?: string;
  user_role?: string;
}

class CommentModel {
  async create(commentData: CommentInput): Promise<Comment> {
    const { user_id, content } = commentData;

    const result = await pool.query(
      `INSERT INTO comments (
        comment_id,
        user_id,
        content,
        status,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, 'pending', NOW(), NOW())
      RETURNING *`,
      [uuidv4(), user_id, content]
    );

    return result.rows[0];
  }

  async findById(commentId: string): Promise<Comment | null> {
    const result = await pool.query(
      "SELECT * FROM comments WHERE comment_id = $1",
      [commentId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async findByUser(
    userId: string,
    limit = 100,
    offset = 0
  ): Promise<Comment[]> {
    const result = await pool.query(
      "SELECT * FROM comments WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [userId, limit, offset]
    );

    return result.rows;
  }

  async getAll(limit = 100, offset = 0): Promise<CommentWithUser[]> {
    const result = await pool.query(
      `SELECT c.*,
              u.full_name as user_name,
              u.role as user_role,
              admin_u.full_name as admin_name
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.user_id
       LEFT JOIN users admin_u ON c.admin_response_by = admin_u.user_id
       ORDER BY c.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows;
  }

  async getByStatus(
    status: string,
    limit = 100,
    offset = 0
  ): Promise<CommentWithUser[]> {
    const result = await pool.query(
      `SELECT c.*,
              u.full_name as user_name,
              u.role as user_role,
              admin_u.full_name as admin_name
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.user_id
       LEFT JOIN users admin_u ON c.admin_response_by = admin_u.user_id
       WHERE c.status = $1
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );

    return result.rows;
  }

  async update(
    commentId: string,
    data: Partial<{ content: string }>
  ): Promise<Comment | null> {
    // Start building the query
    let query = "UPDATE comments SET updated_at = NOW()";
    const values: any[] = [];
    let valueIndex = 1;

    // Add content field if provided
    if (data.content !== undefined) {
      query += `, content = $${valueIndex++}`;
      values.push(data.content);
    }

    // Finalize the query
    query += ` WHERE comment_id = $${valueIndex} RETURNING *`;
    values.push(commentId);

    const result = await pool.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async updateStatus(
    commentId: string,
    status: "pending" | "approved" | "rejected"
  ): Promise<Comment | null> {
    const result = await pool.query(
      "UPDATE comments SET status = $1, updated_at = NOW() WHERE comment_id = $2 RETURNING *",
      [status, commentId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async addAdminResponse(
    commentId: string,
    adminResponse: string,
    adminUserId: string
  ): Promise<Comment | null> {
    const result = await pool.query(
      `UPDATE comments
       SET admin_response = $1,
           admin_response_by = $2,
           admin_response_at = NOW(),
           updated_at = NOW()
       WHERE comment_id = $3
       RETURNING *`,
      [adminResponse, adminUserId, commentId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async delete(commentId: string): Promise<boolean> {
    const result = await pool.query(
      "DELETE FROM comments WHERE comment_id = $1",
      [commentId]
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  async getByUserIdWithReplies(userId: string): Promise<CommentWithUser[]> {
    // First get the comments with user and admin info
    const result = await pool.query(
      `SELECT c.*,
              u.full_name as user_name,
              u.role as user_role,
              admin_u.full_name as admin_name
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.user_id
       LEFT JOIN users admin_u ON c.admin_response_by = admin_u.user_id
       WHERE c.user_id = $1
       ORDER BY c.created_at DESC`,
      [userId]
    );

    const comments: CommentWithUser[] = result.rows;

    // Then get replies for each comment
    for (const comment of comments) {
      const repliesResult = await pool.query(
        `SELECT cr.*, u.full_name as user_name, u.role as user_role
         FROM comment_replies cr
         LEFT JOIN users u ON cr.user_id = u.user_id
         WHERE cr.comment_id = $1
         ORDER BY cr.created_at ASC`,
        [comment.comment_id]
      );
      comment.replies = repliesResult.rows;
    }

    return comments;
  }

  async getAllWithReplies(limit = 100, offset = 0): Promise<CommentWithUser[]> {
    // First get the comments with user and admin info
    const result = await pool.query(
      `SELECT c.*,
              u.full_name as user_name,
              u.role as user_role,
              admin_u.full_name as admin_name
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.user_id
       LEFT JOIN users admin_u ON c.admin_response_by = admin_u.user_id
       ORDER BY c.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const comments: CommentWithUser[] = result.rows;

    // Then get replies for each comment
    for (const comment of comments) {
      const repliesResult = await pool.query(
        `SELECT cr.*, u.full_name as user_name, u.role as user_role
         FROM comment_replies cr
         LEFT JOIN users u ON cr.user_id = u.user_id
         WHERE cr.comment_id = $1
         ORDER BY cr.created_at ASC`,
        [comment.comment_id]
      );
      comment.replies = repliesResult.rows;
    }

    return comments;
  }

  async getByStatusWithReplies(
    status: string,
    limit = 100,
    offset = 0
  ): Promise<CommentWithUser[]> {
    // First get the comments with user and admin info
    const result = await pool.query(
      `SELECT c.*,
              u.full_name as user_name,
              u.role as user_role,
              admin_u.full_name as admin_name
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.user_id
       LEFT JOIN users admin_u ON c.admin_response_by = admin_u.user_id
       WHERE c.status = $1
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );

    const comments: CommentWithUser[] = result.rows;

    // Then get replies for each comment
    for (const comment of comments) {
      const repliesResult = await pool.query(
        `SELECT cr.*, u.full_name as user_name, u.role as user_role
         FROM comment_replies cr
         LEFT JOIN users u ON cr.user_id = u.user_id
         WHERE cr.comment_id = $1
         ORDER BY cr.created_at ASC`,
        [comment.comment_id]
      );
      comment.replies = repliesResult.rows;
    }

    return comments;
  }
}

export default new CommentModel();

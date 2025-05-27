import pool from "../config/database";
import { v4 as uuidv4 } from "uuid";

export interface Vote {
  vote_id: string;
  user_id: string;
  review_id: string;
  vote_type: "helpful" | "not_helpful" | "flag";
  created_at: Date;
}

export interface VoteInput {
  user_id: string;
  review_id: string;
  vote_type: "helpful" | "not_helpful" | "flag";
}

export interface VoteCount {
  vote_type: "helpful" | "not_helpful" | "flag";
  count: number;
}

class VoteModel {
  async create(voteData: VoteInput): Promise<Vote> {
    const { user_id, review_id, vote_type } = voteData;

    // Check if user already voted on this review
    const existingVote = await this.findByUserAndReview(user_id, review_id);

    if (existingVote) {
      // If vote type is the same, return existing vote
      if (existingVote.vote_type === vote_type) {
        return existingVote;
      }

      // Otherwise, update the existing vote
      const updatedVote = await this.update(existingVote.vote_id, {
        vote_type,
      });
      if (!updatedVote) {
        throw new Error("Failed to update vote");
      }
      return updatedVote;
    }

    // Create new vote
    const result = await pool.query(
      `INSERT INTO votes (
        vote_id,
        user_id,
        review_id,
        vote_type,
        created_at
      )
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *`,
      [uuidv4(), user_id, review_id, vote_type]
    );

    return result.rows[0];
  }

  async findById(voteId: string): Promise<Vote | null> {
    const result = await pool.query("SELECT * FROM votes WHERE vote_id = $1", [
      voteId,
    ]);

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async findByUserAndReview(
    userId: string,
    reviewId: string
  ): Promise<Vote | null> {
    const result = await pool.query(
      "SELECT * FROM votes WHERE user_id = $1 AND review_id = $2",
      [userId, reviewId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async update(
    voteId: string,
    voteData: Partial<VoteInput>
  ): Promise<Vote | null> {
    // Start building the query
    let query = "UPDATE votes SET ";
    const values: any[] = [];
    let valueIndex = 1;

    // Add each field to update
    const updateFields: string[] = [];

    if (voteData.vote_type) {
      updateFields.push(`vote_type = $${valueIndex++}`);
      values.push(voteData.vote_type);
    }

    // Complete the query
    query += updateFields.join(", ");
    query += ` WHERE vote_id = $${valueIndex} RETURNING *`;
    values.push(voteId);

    const result = await pool.query(query, values);

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async delete(voteId: string): Promise<boolean> {
    const result = await pool.query(
      "DELETE FROM votes WHERE vote_id = $1 RETURNING *",
      [voteId]
    );

    return result.rows.length > 0;
  }

  async deleteByUserAndReview(
    userId: string,
    reviewId: string
  ): Promise<boolean> {
    const result = await pool.query(
      "DELETE FROM votes WHERE user_id = $1 AND review_id = $2 RETURNING *",
      [userId, reviewId]
    );

    return result.rows.length > 0;
  }

  async getByReview(reviewId: string): Promise<Vote[]> {
    const result = await pool.query(
      "SELECT * FROM votes WHERE review_id = $1",
      [reviewId]
    );

    return result.rows;
  }

  async getByUser(userId: string): Promise<Vote[]> {
    const result = await pool.query("SELECT * FROM votes WHERE user_id = $1", [
      userId,
    ]);

    return result.rows;
  }

  async getVoteCountsByReview(reviewId: string): Promise<VoteCount[]> {
    const result = await pool.query(
      `SELECT
        vote_type,
        COUNT(*) as count
       FROM votes
       WHERE review_id = $1
       GROUP BY vote_type`,
      [reviewId]
    );

    return result.rows.map((row) => ({
      vote_type: row.vote_type,
      count: parseInt(row.count),
    }));
  }

  async getFlaggedReviews(
    limit: number = 100,
    offset: number = 0
  ): Promise<any[]> {
    const result = await pool.query(
      `SELECT
        r.*,
        COUNT(v.vote_id) as flag_count,
        u.full_name as user_name,
        u.email as user_email,
        o.name as office_name
       FROM reviews r
       JOIN votes v ON r.review_id = v.review_id
       LEFT JOIN users u ON r.user_id = u.user_id
       LEFT JOIN offices o ON r.office_id = o.office_id
       WHERE v.vote_type = 'flag'
       GROUP BY r.review_id, u.full_name, u.email, o.name
       ORDER BY flag_count DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows;
  }

  async getFlaggedReviewsWithStatus(
    status: "pending" | "approved" | "rejected" | "resolved",
    limit: number = 100,
    offset: number = 0
  ): Promise<any[]> {
    const result = await pool.query(
      `SELECT
        r.*,
        COUNT(v.vote_id) as flag_count,
        u.full_name as user_name,
        u.email as user_email,
        o.name as office_name
       FROM reviews r
       JOIN votes v ON r.review_id = v.review_id
       LEFT JOIN users u ON r.user_id = u.user_id
       LEFT JOIN offices o ON r.office_id = o.office_id
       WHERE v.vote_type = 'flag' AND r.status = $1
       GROUP BY r.review_id, u.full_name, u.email, o.name
       ORDER BY flag_count DESC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );

    return result.rows;
  }

  async getFlagCountForReview(reviewId: string): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*) as flag_count
       FROM votes
       WHERE review_id = $1 AND vote_type = 'flag'`,
      [reviewId]
    );

    return parseInt(result.rows[0]?.flag_count) || 0;
  }

  // Get user vote statistics
  async getUserVoteStats(userId: string): Promise<{
    upvotes: number;
    downvotes: number;
    flags: number;
  }> {
    const result = await pool.query(
      `SELECT
        vote_type,
        COUNT(*) as count
       FROM votes
       WHERE user_id = $1
       GROUP BY vote_type`,
      [userId]
    );

    // Initialize with zeros
    const stats: {
      upvotes: number;
      downvotes: number;
      flags: number;
    } = {
      upvotes: 0,
      downvotes: 0,
      flags: 0,
    };

    // Map database vote types to frontend types
    result.rows.forEach((row) => {
      if (row.vote_type === "helpful") {
        stats.upvotes = parseInt(row.count);
      } else if (row.vote_type === "not_helpful") {
        stats.downvotes = parseInt(row.count);
      } else if (row.vote_type === "flag") {
        stats.flags = parseInt(row.count);
      }
    });

    return stats;
  }

  // Get overall vote statistics
  async getVoteStatistics(): Promise<{
    total_helpful: number;
    total_not_helpful: number;
    total_flags: number;
    most_voted_reviews: {
      review_id: string;
      content: string;
      helpful_count: number;
      not_helpful_count: number;
      total_votes: number;
    }[];
  }> {
    // Get total counts by vote type
    const countsResult = await pool.query(
      `SELECT
        vote_type,
        COUNT(*) as count
       FROM votes
       GROUP BY vote_type`
    );

    // Initialize with zeros
    const stats: {
      total_helpful: number;
      total_not_helpful: number;
      total_flags: number;
      most_voted_reviews: {
        review_id: string;
        content: string;
        helpful_count: number;
        not_helpful_count: number;
        total_votes: number;
      }[];
    } = {
      total_helpful: 0,
      total_not_helpful: 0,
      total_flags: 0,
      most_voted_reviews: [],
    };

    // Map database vote types to frontend types
    countsResult.rows.forEach((row) => {
      if (row.vote_type === "helpful") {
        stats.total_helpful = parseInt(row.count);
      } else if (row.vote_type === "not_helpful") {
        stats.total_not_helpful = parseInt(row.count);
      } else if (row.vote_type === "flag") {
        stats.total_flags = parseInt(row.count);
      }
    });

    // Get most voted reviews
    const reviewsResult = await pool.query(
      `SELECT
        r.review_id,
        r.comment,
        SUM(CASE WHEN v.vote_type = 'helpful' THEN 1 ELSE 0 END) as helpful_count,
        SUM(CASE WHEN v.vote_type = 'not_helpful' THEN 1 ELSE 0 END) as not_helpful_count,
        COUNT(v.vote_id) as total_votes
       FROM reviews r
       JOIN votes v ON r.review_id = v.review_id
       GROUP BY r.review_id
       ORDER BY total_votes DESC
       LIMIT 5`
    );

    stats.most_voted_reviews = reviewsResult.rows.map((row) => ({
      review_id: row.review_id as string,
      content: row.comment as string, // Map comment to content for frontend compatibility
      helpful_count: parseInt(row.helpful_count),
      not_helpful_count: parseInt(row.not_helpful_count),
      total_votes: parseInt(row.total_votes),
    }));

    return stats;
  }

  // Get reviews that user has upvoted (filtered by official's office)
  async getUserUpvotedReviews(userId: string): Promise<any[]> {
    // First get the user's office_id if they are an official
    const userResult = await pool.query(
      `SELECT office_id, role FROM users WHERE user_id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return [];
    }

    const user = userResult.rows[0];
    let whereClause = `v.user_id = $1 AND v.vote_type = 'helpful' AND r.status = 'approved'`;
    let queryParams = [userId];

    // If user is an official, filter by their assigned office
    if (user.role === "official" && user.office_id) {
      whereClause += ` AND r.office_id = $2`;
      queryParams.push(user.office_id);
    }

    const result = await pool.query(
      `SELECT
        r.review_id,
        r.user_id,
        r.office_id,
        r.rating,
        r.comment,
        r.is_anonymous,
        r.created_at,
        r.updated_at,
        r.status,
        CASE
          WHEN r.is_anonymous = true THEN NULL
          ELSE u.full_name
        END as user_name,
        o.name as office_name,
        v.created_at as voted_at
       FROM votes v
       JOIN reviews r ON v.review_id = r.review_id
       LEFT JOIN users u ON r.user_id = u.user_id
       LEFT JOIN offices o ON r.office_id = o.office_id
       WHERE ${whereClause}
       ORDER BY v.created_at DESC`,
      queryParams
    );

    return result.rows;
  }

  // Get reviews that user has downvoted (filtered by official's office)
  async getUserDownvotedReviews(userId: string): Promise<any[]> {
    // First get the user's office_id if they are an official
    const userResult = await pool.query(
      `SELECT office_id, role FROM users WHERE user_id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return [];
    }

    const user = userResult.rows[0];
    let whereClause = `v.user_id = $1 AND v.vote_type = 'not_helpful' AND r.status = 'approved'`;
    let queryParams = [userId];

    // If user is an official, filter by their assigned office
    if (user.role === "official" && user.office_id) {
      whereClause += ` AND r.office_id = $2`;
      queryParams.push(user.office_id);
    }

    const result = await pool.query(
      `SELECT
        r.review_id,
        r.user_id,
        r.office_id,
        r.rating,
        r.comment,
        r.is_anonymous,
        r.created_at,
        r.updated_at,
        r.status,
        CASE
          WHEN r.is_anonymous = true THEN NULL
          ELSE u.full_name
        END as user_name,
        o.name as office_name,
        v.created_at as voted_at
       FROM votes v
       JOIN reviews r ON v.review_id = r.review_id
       LEFT JOIN users u ON r.user_id = u.user_id
       LEFT JOIN offices o ON r.office_id = o.office_id
       WHERE ${whereClause}
       ORDER BY v.created_at DESC`,
      queryParams
    );

    return result.rows;
  }
}

export default new VoteModel();

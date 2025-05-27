import pool from "../config/database";
import { v4 as uuidv4 } from "uuid";

export interface Review {
  review_id: string;
  user_id?: string;
  office_id: string;
  rating: number;
  comment?: string;
  is_anonymous: boolean;
  created_at: Date;
  updated_at: Date;
  status: "pending" | "approved" | "flagged" | "removed";
}

export interface ReviewInput {
  user_id?: string;
  office_id: string;
  rating: number;
  comment?: string;
  is_anonymous: boolean;
}

class ReviewModel {
  async create(reviewData: ReviewInput): Promise<Review> {
    const { user_id, office_id, rating, comment, is_anonymous } = reviewData;

    const result = await pool.query(
      `INSERT INTO reviews (
        review_id,
        user_id,
        office_id,
        rating,
        comment,
        is_anonymous,
        created_at,
        updated_at,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), 'approved')
      RETURNING *`,
      [uuidv4(), user_id, office_id, rating, comment, is_anonymous]
    );

    return result.rows[0];
  }

  async findById(reviewId: string): Promise<Review | null> {
    const result = await pool.query(
      "SELECT * FROM reviews WHERE review_id = $1",
      [reviewId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async update(
    reviewId: string,
    reviewData: Partial<ReviewInput>
  ): Promise<Review | null> {
    // Start building the query
    let query = "UPDATE reviews SET ";
    const values: any[] = [];
    let valueIndex = 1;

    // Add each field to update
    const updateFields: string[] = [];

    if (reviewData.rating !== undefined) {
      updateFields.push(`rating = $${valueIndex++}`);
      values.push(reviewData.rating);
    }

    if (reviewData.comment !== undefined) {
      updateFields.push(`comment = $${valueIndex++}`);
      values.push(reviewData.comment);
    }

    if (reviewData.is_anonymous !== undefined) {
      updateFields.push(`is_anonymous = $${valueIndex++}`);
      values.push(reviewData.is_anonymous);
    }

    // Always update the updated_at timestamp
    updateFields.push("updated_at = NOW()");

    // Complete the query
    query += updateFields.join(", ");
    query += ` WHERE review_id = $${valueIndex} RETURNING *`;
    values.push(reviewId);

    const result = await pool.query(query, values);

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async updateStatus(
    reviewId: string,
    status: "pending" | "approved" | "flagged" | "rejected" | "resolved"
  ): Promise<Review | null> {
    const result = await pool.query(
      "UPDATE reviews SET status = $1, updated_at = NOW() WHERE review_id = $2 RETURNING *",
      [status, reviewId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async getReviewWithUserDetails(reviewId: string): Promise<any | null> {
    const result = await pool.query(
      `SELECT
        r.*,
        CASE
          WHEN r.is_anonymous = true THEN NULL
          ELSE u.full_name
        END as user_name,
        CASE
          WHEN r.is_anonymous = true THEN NULL
          ELSE u.email
        END as user_email,
        o.name as office_name
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.user_id
       LEFT JOIN offices o ON r.office_id = o.office_id
       WHERE r.review_id = $1`,
      [reviewId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async getFlaggedReviews(
    limit: number = 20,
    offset: number = 0
  ): Promise<any[]> {
    const result = await pool.query(
      `SELECT
        r.*,
        CASE
          WHEN r.is_anonymous = true THEN NULL
          ELSE u.full_name
        END as user_name,
        CASE
          WHEN r.is_anonymous = true THEN NULL
          ELSE u.email
        END as user_email,
        o.name as office_name
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.user_id
       LEFT JOIN offices o ON r.office_id = o.office_id
       WHERE r.status = 'flagged'
       ORDER BY r.updated_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows;
  }

  async delete(reviewId: string): Promise<boolean> {
    const result = await pool.query(
      "DELETE FROM reviews WHERE review_id = $1 RETURNING *",
      [reviewId]
    );

    return result.rows.length > 0;
  }

  async getByOffice(
    officeId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<any[]> {
    const result = await pool.query(
      `SELECT
        r.*,
        o.name as office_name,
        CASE
          WHEN r.is_anonymous = true THEN NULL
          ELSE u.full_name
        END as user_name
       FROM reviews r
       LEFT JOIN offices o ON r.office_id = o.office_id
       LEFT JOIN users u ON r.user_id = u.user_id
       WHERE r.office_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [officeId, limit, offset]
    );

    // Log a sample of the results for debugging
    if (result.rows.length > 0) {
      console.log("Sample review from getByOffice:", {
        review_id: result.rows[0].review_id,
        user_id: result.rows[0].user_id,
        is_anonymous: result.rows[0].is_anonymous,
        user_name: result.rows[0].user_name,
        office_name: result.rows[0].office_name,
      });
    }

    return result.rows;
  }

  async getByUser(
    userId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<any[]> {
    const result = await pool.query(
      `SELECT
        r.*,
        u.full_name as user_name,
        u.email as user_email,
        o.name as office_name,
        o.office_id as office_id
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.user_id
       LEFT JOIN offices o ON r.office_id = o.office_id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows;
  }

  async getByStatus(
    status: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<Review[]> {
    const result = await pool.query(
      `SELECT * FROM reviews
       WHERE status = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );

    return result.rows;
  }

  async getAll(limit: number = 100, offset: number = 0): Promise<Review[]> {
    const result = await pool.query(
      `SELECT * FROM reviews
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows;
  }

  async getAllWithDetails(
    limit: number = 100,
    offset: number = 0
  ): Promise<any[]> {
    const result = await pool.query(
      `SELECT
        r.*,
        CASE
          WHEN r.is_anonymous = true THEN NULL
          ELSE u.full_name
        END as user_name,
        CASE
          WHEN r.is_anonymous = true THEN NULL
          ELSE u.email
        END as user_email,
        o.name as office_name
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.user_id
       LEFT JOIN offices o ON r.office_id = o.office_id
       ORDER BY r.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows;
  }

  async getAllWithReplies(
    limit: number = 100,
    offset: number = 0
  ): Promise<any[]> {
    // First get all reviews with user and office details
    const reviewsResult = await pool.query(
      `SELECT
        r.*,
        CASE
          WHEN r.is_anonymous = true THEN NULL
          ELSE u.full_name
        END as user_name,
        CASE
          WHEN r.is_anonymous = true THEN NULL
          ELSE u.email
        END as user_email,
        o.name as office_name
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.user_id
       LEFT JOIN offices o ON r.office_id = o.office_id
       ORDER BY r.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const reviews = reviewsResult.rows;

    // Get all replies for these reviews
    if (reviews.length > 0) {
      const reviewIds = reviews.map((r) => r.review_id);
      const repliesResult = await pool.query(
        `SELECT
          rr.*,
          u.full_name as user_name,
          u.role as user_role
         FROM review_replies rr
         LEFT JOIN users u ON rr.user_id = u.user_id
         WHERE rr.review_id = ANY($1)
         ORDER BY rr.created_at ASC`,
        [reviewIds]
      );

      // Group replies by review_id
      const repliesByReview: { [key: string]: any[] } = {};
      repliesResult.rows.forEach((reply) => {
        if (!repliesByReview[reply.review_id]) {
          repliesByReview[reply.review_id] = [];
        }
        repliesByReview[reply.review_id].push(reply);
      });

      // Add replies to reviews
      reviews.forEach((review) => {
        review.replies = repliesByReview[review.review_id] || [];
      });
    }

    return reviews;
  }

  async getByOfficeWithReplies(
    officeId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<any[]> {
    // First get all reviews for the office with user and office details
    const reviewsResult = await pool.query(
      `SELECT
        r.*,
        CASE
          WHEN r.is_anonymous = true THEN NULL
          ELSE u.full_name
        END as user_name,
        CASE
          WHEN r.is_anonymous = true THEN NULL
          ELSE u.email
        END as user_email,
        o.name as office_name
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.user_id
       LEFT JOIN offices o ON r.office_id = o.office_id
       WHERE r.office_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [officeId, limit, offset]
    );

    const reviews = reviewsResult.rows;

    // Get all replies for these reviews
    if (reviews.length > 0) {
      const reviewIds = reviews.map((r) => r.review_id);
      const repliesResult = await pool.query(
        `SELECT
          rr.*,
          u.full_name as user_name,
          u.role as user_role
         FROM review_replies rr
         LEFT JOIN users u ON rr.user_id = u.user_id
         WHERE rr.review_id = ANY($1)
         ORDER BY rr.created_at ASC`,
        [reviewIds]
      );

      // Group replies by review_id
      const repliesByReview: { [key: string]: any[] } = {};
      repliesResult.rows.forEach((reply) => {
        if (!repliesByReview[reply.review_id]) {
          repliesByReview[reply.review_id] = [];
        }
        repliesByReview[reply.review_id].push(reply);
      });

      // Add replies to reviews
      reviews.forEach((review) => {
        review.replies = repliesByReview[review.review_id] || [];
      });
    }

    return reviews;
  }

  async getByUserWithReplies(
    userId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<any[]> {
    // First get all reviews by the user with user and office details
    // When users view their own reviews, they should always see their own name
    const reviewsResult = await pool.query(
      `SELECT
        r.*,
        u.full_name as user_name,
        u.email as user_email,
        o.name as office_name
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.user_id
       LEFT JOIN offices o ON r.office_id = o.office_id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const reviews = reviewsResult.rows;

    // Get all replies for these reviews
    if (reviews.length > 0) {
      const reviewIds = reviews.map((r) => r.review_id);
      const repliesResult = await pool.query(
        `SELECT
          rr.*,
          u.full_name as user_name,
          u.role as user_role
         FROM review_replies rr
         LEFT JOIN users u ON rr.user_id = u.user_id
         WHERE rr.review_id = ANY($1)
         ORDER BY rr.created_at ASC`,
        [reviewIds]
      );

      // Group replies by review_id
      const repliesByReview: { [key: string]: any[] } = {};
      repliesResult.rows.forEach((reply) => {
        if (!repliesByReview[reply.review_id]) {
          repliesByReview[reply.review_id] = [];
        }
        repliesByReview[reply.review_id].push(reply);
      });

      // Add replies to reviews
      reviews.forEach((review) => {
        review.replies = repliesByReview[review.review_id] || [];
      });
    }

    return reviews;
  }

  async getAverageRatingByOffice(officeId: string): Promise<number> {
    const result = await pool.query(
      `SELECT AVG(rating) as average_rating
       FROM reviews
       WHERE office_id = $1 AND status = 'approved'`,
      [officeId]
    );

    return result.rows[0]?.average_rating || 0;
  }

  async getReviewCountByOffice(officeId: string): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*) as review_count
       FROM reviews
       WHERE office_id = $1 AND status = 'approved'`,
      [officeId]
    );

    return parseInt(result.rows[0]?.review_count) || 0;
  }

  async getDailyReviewCountByUser(userId: string): Promise<number> {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );

    const result = await pool.query(
      `SELECT COUNT(*) as review_count
       FROM reviews
       WHERE user_id = $1 AND created_at >= $2 AND created_at < $3`,
      [userId, startOfDay.toISOString(), endOfDay.toISOString()]
    );

    return parseInt(result.rows[0]?.review_count) || 0;
  }

  async getPublicReviews(
    limit: number = 50,
    offset: number = 0,
    sortBy: string = "created_at",
    sortOrder: string = "desc"
  ): Promise<any[]> {
    // Validate sort parameters to prevent SQL injection
    const validSortColumns = ["created_at", "rating", "updated_at"];
    const validSortOrders = ["asc", "desc"];

    const safeSortBy = validSortColumns.includes(sortBy)
      ? sortBy
      : "created_at";
    const safeSortOrder = validSortOrders.includes(sortOrder.toLowerCase())
      ? sortOrder.toLowerCase()
      : "desc";

    // Build the query with safe parameters
    let query = `SELECT
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
      COALESCE(v_helpful.helpful_count, 0) as upvote_count,
      COALESCE(v_not_helpful.not_helpful_count, 0) as downvote_count,
      COALESCE(v_flag.flag_count, 0) as flag_count
     FROM reviews r
     LEFT JOIN users u ON r.user_id = u.user_id
     LEFT JOIN offices o ON r.office_id = o.office_id
     LEFT JOIN (
       SELECT review_id, COUNT(*) as helpful_count
       FROM votes
       WHERE vote_type = 'helpful'
       GROUP BY review_id
     ) v_helpful ON r.review_id = v_helpful.review_id
     LEFT JOIN (
       SELECT review_id, COUNT(*) as not_helpful_count
       FROM votes
       WHERE vote_type = 'not_helpful'
       GROUP BY review_id
     ) v_not_helpful ON r.review_id = v_not_helpful.review_id
     LEFT JOIN (
       SELECT review_id, COUNT(*) as flag_count
       FROM votes
       WHERE vote_type = 'flag'
       GROUP BY review_id
     ) v_flag ON r.review_id = v_flag.review_id
     WHERE r.status = 'approved'
     ORDER BY `;

    // Add the safe sort column and order
    if (safeSortBy === "rating") {
      query += "r.rating ";
    } else if (safeSortBy === "updated_at") {
      query += "r.updated_at ";
    } else {
      query += "r.created_at ";
    }

    query += safeSortOrder === "asc" ? "ASC" : "DESC";
    query += " LIMIT $1 OFFSET $2";

    const result = await pool.query(query, [limit, offset]);

    return result.rows;
  }
}

export default new ReviewModel();

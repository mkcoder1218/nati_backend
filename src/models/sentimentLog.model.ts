import pool from "../config/database";
import { v4 as uuidv4 } from "uuid";

export interface SentimentLog {
  log_id: string;
  review_id: string;
  sentiment: "positive" | "negative" | "neutral";
  category?: string;
  confidence_score: number;
  processed_at: Date;
  language: "amharic" | "english";
}

export interface SentimentLogInput {
  review_id: string;
  sentiment: "positive" | "negative" | "neutral";
  category?: string;
  confidence_score: number;
  language: "amharic" | "english";
}

class SentimentLogModel {
  async create(logData: SentimentLogInput): Promise<SentimentLog> {
    const { review_id, sentiment, category, confidence_score, language } =
      logData;

    const result = await pool.query(
      `INSERT INTO sentiment_logs (
        log_id,
        review_id,
        sentiment,
        category,
        confidence_score,
        processed_at,
        language
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), $6)
      RETURNING *`,
      [uuidv4(), review_id, sentiment, category, confidence_score, language]
    );

    return result.rows[0];
  }

  async findById(logId: string): Promise<SentimentLog | null> {
    const result = await pool.query(
      "SELECT * FROM sentiment_logs WHERE log_id = $1",
      [logId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async findByReviewId(reviewId: string): Promise<SentimentLog | null> {
    const result = await pool.query(
      "SELECT * FROM sentiment_logs WHERE review_id = $1",
      [reviewId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async update(
    logId: string,
    logData: Partial<SentimentLogInput>
  ): Promise<SentimentLog | null> {
    // Start building the query
    let query = "UPDATE sentiment_logs SET ";
    const values: any[] = [];
    let valueIndex = 1;

    // Add each field to update
    const updateFields: string[] = [];

    if (logData.sentiment) {
      updateFields.push(`sentiment = $${valueIndex++}`);
      values.push(logData.sentiment);
    }

    if (logData.category !== undefined) {
      updateFields.push(`category = $${valueIndex++}`);
      values.push(logData.category);
    }

    if (logData.confidence_score !== undefined) {
      updateFields.push(`confidence_score = $${valueIndex++}`);
      values.push(logData.confidence_score);
    }

    if (logData.language) {
      updateFields.push(`language = $${valueIndex++}`);
      values.push(logData.language);
    }

    // Always update the processed_at timestamp
    updateFields.push("processed_at = NOW()");

    // Complete the query
    query += updateFields.join(", ");
    query += ` WHERE log_id = $${valueIndex} RETURNING *`;
    values.push(logId);

    const result = await pool.query(query, values);

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async delete(logId: string): Promise<boolean> {
    const result = await pool.query(
      "DELETE FROM sentiment_logs WHERE log_id = $1 RETURNING *",
      [logId]
    );

    return result.rows.length > 0;
  }

  async getAll(
    limit: number = 100,
    offset: number = 0
  ): Promise<SentimentLog[]> {
    const result = await pool.query(
      `SELECT * FROM sentiment_logs
       ORDER BY processed_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows;
  }

  async getBySentiment(
    sentiment: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<SentimentLog[]> {
    const result = await pool.query(
      `SELECT * FROM sentiment_logs
       WHERE sentiment = $1
       ORDER BY processed_at DESC
       LIMIT $2 OFFSET $3`,
      [sentiment, limit, offset]
    );

    return result.rows;
  }

  async getByCategory(
    category: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<SentimentLog[]> {
    const result = await pool.query(
      `SELECT * FROM sentiment_logs
       WHERE category = $1
       ORDER BY processed_at DESC
       LIMIT $2 OFFSET $3`,
      [category, limit, offset]
    );

    return result.rows;
  }

  async getByLanguage(
    language: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<SentimentLog[]> {
    const result = await pool.query(
      `SELECT * FROM sentiment_logs
       WHERE language = $1
       ORDER BY processed_at DESC
       LIMIT $2 OFFSET $3`,
      [language, limit, offset]
    );

    return result.rows;
  }

  async getSentimentStats(): Promise<any> {
    const result = await pool.query(
      `SELECT
        sentiment,
        COUNT(*) as count,
        AVG(confidence_score) as avg_confidence
       FROM sentiment_logs
       GROUP BY sentiment`
    );

    // Initialize counts
    let positive = 0;
    let negative = 0;
    let neutral = 0;
    let total = 0;

    // Process the results
    result.rows.forEach((row) => {
      const count = parseInt(row.count);
      total += count;

      switch (row.sentiment) {
        case "positive":
          positive = count;
          break;
        case "negative":
          negative = count;
          break;
        case "neutral":
          neutral = count;
          break;
      }
    });

    return {
      positive,
      negative,
      neutral,
      total,
      sentimentCounts: {
        positive,
        negative,
        neutral,
      },
      categoryCounts: {}, // TODO: Implement category counts if needed
      languageCounts: {}, // TODO: Implement language counts if needed
    };
  }
}

export default new SentimentLogModel();

import pool from "../config/database";
import { v4 as uuidv4 } from "uuid";

export interface OfficeVote {
  vote_id: string;
  user_id: string;
  office_id: string;
  vote_type: "upvote" | "downvote";
  created_at: Date;
  updated_at: Date;
}

export interface OfficeVoteInput {
  user_id: string;
  office_id: string;
  vote_type: "upvote" | "downvote";
}

export interface OfficeVoteCounts {
  upvotes: number;
  downvotes: number;
  total: number;
  ratio: number;
}

export interface OfficeVoteStats {
  office_id: string;
  office_name: string;
  upvotes: number;
  downvotes: number;
  total: number;
  ratio: number;
}

export interface UserOfficeVoteStats {
  upvotes: number;
  downvotes: number;
  total: number;
  voted_offices: {
    office_id: string;
    office_name: string;
    vote_type: "upvote" | "downvote";
    created_at: Date;
  }[];
}

export interface VoteTrend {
  date: string;
  upvotes: number;
  downvotes: number;
  total: number;
}

class OfficeVoteModel {
  async create(voteData: OfficeVoteInput): Promise<OfficeVote> {
    const { user_id, office_id, vote_type } = voteData;

    // Use a transaction to ensure data consistency
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Check if user already voted on this office
      const existingVoteResult = await client.query(
        "SELECT * FROM office_votes WHERE user_id = $1 AND office_id = $2",
        [user_id, office_id]
      );

      const existingVote =
        existingVoteResult.rows.length > 0 ? existingVoteResult.rows[0] : null;

      let vote;

      if (existingVote) {
        // If vote type is the same, return existing vote
        if (existingVote.vote_type === vote_type) {
          await client.query("COMMIT");
          return existingVote;
        }

        // Otherwise, update the existing vote
        const updateResult = await client.query(
          `UPDATE office_votes
           SET vote_type = $1, updated_at = NOW()
           WHERE vote_id = $2
           RETURNING *`,
          [vote_type, existingVote.vote_id]
        );

        if (updateResult.rows.length === 0) {
          throw new Error("Failed to update vote");
        }

        vote = updateResult.rows[0];
      } else {
        // Create new vote
        const insertResult = await client.query(
          `INSERT INTO office_votes (
            vote_id,
            user_id,
            office_id,
            vote_type,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          RETURNING *`,
          [uuidv4(), user_id, office_id, vote_type]
        );

        vote = insertResult.rows[0];
      }

      // Update the office vote counts in the offices table
      await client.query(
        `UPDATE offices
         SET
           upvote_count = (SELECT COUNT(*) FROM office_votes WHERE office_id = $1 AND vote_type = 'upvote'),
           downvote_count = (SELECT COUNT(*) FROM office_votes WHERE office_id = $1 AND vote_type = 'downvote')
         WHERE office_id = $1`,
        [office_id]
      );

      // Commit the transaction
      await client.query("COMMIT");

      return vote;
    } catch (error) {
      // Rollback in case of error
      await client.query("ROLLBACK");
      throw error;
    } finally {
      // Release the client back to the pool
      client.release();
    }
  }

  async findById(voteId: string): Promise<OfficeVote | null> {
    const result = await pool.query(
      "SELECT * FROM office_votes WHERE vote_id = $1",
      [voteId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async findByUserAndOffice(
    userId: string,
    officeId: string
  ): Promise<OfficeVote | null> {
    const result = await pool.query(
      "SELECT * FROM office_votes WHERE user_id = $1 AND office_id = $2",
      [userId, officeId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async update(
    voteId: string,
    voteData: Partial<OfficeVoteInput>
  ): Promise<OfficeVote | null> {
    // Start building the query
    let query = "UPDATE office_votes SET updated_at = NOW()";
    const values: any[] = [];
    let valueIndex = 1;

    // Add each field to update
    if (voteData.vote_type) {
      query += `, vote_type = $${valueIndex++}`;
      values.push(voteData.vote_type);
    }

    // Complete the query
    query += ` WHERE vote_id = $${valueIndex} RETURNING *`;
    values.push(voteId);

    const result = await pool.query(query, values);

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async delete(voteId: string): Promise<boolean> {
    const result = await pool.query(
      "DELETE FROM office_votes WHERE vote_id = $1 RETURNING *",
      [voteId]
    );

    return result.rows.length > 0;
  }

  async deleteByUserAndOffice(
    userId: string,
    officeId: string
  ): Promise<boolean> {
    // Use a transaction to ensure data consistency
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Delete the vote
      const result = await client.query(
        "DELETE FROM office_votes WHERE user_id = $1 AND office_id = $2 RETURNING *",
        [userId, officeId]
      );

      const deleted = result.rows.length > 0;

      if (deleted) {
        // Update the office vote counts in the offices table
        await client.query(
          `UPDATE offices
           SET
             upvote_count = (SELECT COUNT(*) FROM office_votes WHERE office_id = $1 AND vote_type = 'upvote'),
             downvote_count = (SELECT COUNT(*) FROM office_votes WHERE office_id = $1 AND vote_type = 'downvote')
           WHERE office_id = $1`,
          [officeId]
        );
      }

      // Commit the transaction
      await client.query("COMMIT");

      return deleted;
    } catch (error) {
      // Rollback in case of error
      await client.query("ROLLBACK");
      throw error;
    } finally {
      // Release the client back to the pool
      client.release();
    }
  }

  async getByOffice(officeId: string): Promise<OfficeVote[]> {
    const result = await pool.query(
      "SELECT * FROM office_votes WHERE office_id = $1",
      [officeId]
    );

    return result.rows;
  }

  async getByUser(userId: string): Promise<OfficeVote[]> {
    const result = await pool.query(
      "SELECT ov.*, o.name as office_name FROM office_votes ov JOIN offices o ON ov.office_id = o.office_id WHERE ov.user_id = $1 ORDER BY ov.created_at DESC",
      [userId]
    );

    return result.rows;
  }

  async getVoteCountsByOffice(officeId: string): Promise<OfficeVoteCounts> {
    // Use a transaction to ensure we get the most up-to-date counts
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Force a refresh of the vote counts
      await client.query("COMMIT");

      // Now get the latest counts
      const result = await client.query(
        `SELECT
          SUM(CASE WHEN vote_type = 'upvote' THEN 1 ELSE 0 END) as upvotes,
          SUM(CASE WHEN vote_type = 'downvote' THEN 1 ELSE 0 END) as downvotes,
          COUNT(*) as total
         FROM office_votes
         WHERE office_id = $1`,
        [officeId]
      );

      const counts = result.rows[0];
      const upvotes = parseInt(counts.upvotes) || 0;
      const downvotes = parseInt(counts.downvotes) || 0;
      const total = parseInt(counts.total) || 0;
      const ratio = total > 0 ? Math.round((upvotes / total) * 100) : 0;

      return {
        upvotes,
        downvotes,
        total,
        ratio,
      };
    } finally {
      client.release();
    }
  }

  async getUserVoteStats(userId: string): Promise<UserOfficeVoteStats> {
    // Get vote counts
    const countsResult = await pool.query(
      `SELECT
        SUM(CASE WHEN vote_type = 'upvote' THEN 1 ELSE 0 END) as upvotes,
        SUM(CASE WHEN vote_type = 'downvote' THEN 1 ELSE 0 END) as downvotes,
        COUNT(*) as total
       FROM office_votes
       WHERE user_id = $1`,
      [userId]
    );

    // Get voted offices with details
    const votedOfficesResult = await pool.query(
      `SELECT ov.office_id, o.name as office_name, ov.vote_type, ov.created_at
       FROM office_votes ov
       JOIN offices o ON ov.office_id = o.office_id
       WHERE ov.user_id = $1
       ORDER BY ov.created_at DESC`,
      [userId]
    );

    const counts = countsResult.rows[0];

    return {
      upvotes: parseInt(counts.upvotes) || 0,
      downvotes: parseInt(counts.downvotes) || 0,
      total: parseInt(counts.total) || 0,
      voted_offices: votedOfficesResult.rows,
    };
  }

  async getTopVotedOffices(
    limit: number = 10,
    voteType: "upvote" | "downvote" | "total" = "total"
  ): Promise<OfficeVoteStats[]> {
    let orderBy = "";

    if (voteType === "upvote") {
      orderBy = "upvote_count DESC";
    } else if (voteType === "downvote") {
      orderBy = "downvote_count DESC";
    } else {
      orderBy = "(upvote_count + downvote_count) DESC";
    }

    const result = await pool.query(
      `SELECT
        o.office_id,
        o.name as office_name,
        o.upvote_count as upvotes,
        o.downvote_count as downvotes,
        (o.upvote_count + o.downvote_count) as total,
        CASE
          WHEN (o.upvote_count + o.downvote_count) > 0
          THEN ROUND((o.upvote_count::numeric / (o.upvote_count + o.downvote_count)) * 100)
          ELSE 0
        END as ratio
       FROM offices o
       ORDER BY ${orderBy}
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  }

  async getVoteTrends(
    officeId: string | null = null,
    period: "daily" | "weekly" | "monthly" = "daily",
    limit: number = 30
  ): Promise<VoteTrend[]> {
    let timeFormat = "";
    let groupBy = "";

    if (period === "daily") {
      timeFormat = "YYYY-MM-DD";
      groupBy = "date_trunc('day', created_at)";
    } else if (period === "weekly") {
      timeFormat = "YYYY-WW";
      groupBy = "date_trunc('week', created_at)";
    } else {
      timeFormat = "YYYY-MM";
      groupBy = "date_trunc('month', created_at)";
    }

    let query = `
      SELECT
        to_char(${groupBy}, '${timeFormat}') as date,
        SUM(CASE WHEN vote_type = 'upvote' THEN 1 ELSE 0 END) as upvotes,
        SUM(CASE WHEN vote_type = 'downvote' THEN 1 ELSE 0 END) as downvotes,
        COUNT(*) as total
      FROM office_votes
    `;

    const values: any[] = [];
    let valueIndex = 1;

    if (officeId) {
      query += ` WHERE office_id = $${valueIndex++}`;
      values.push(officeId);
    }

    query += `
      GROUP BY date, ${groupBy}
      ORDER BY ${groupBy} DESC
      LIMIT $${valueIndex}
    `;
    values.push(limit);

    const result = await pool.query(query, values);

    // Reverse to get chronological order
    return result.rows.reverse();
  }
}

export default new OfficeVoteModel();

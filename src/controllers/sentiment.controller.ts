import { Request, Response } from "express";
import SentimentLogModel from "../models/sentimentLog.model";
import { analyzeSentiment } from "../services/sentiment.service";
import pool from "../config/database";

// Analyze text sentiment
export const analyzeText = async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        status: "error",
        message: "Text is required",
      });
    }

    const result = await analyzeSentiment(text);

    return res.status(200).json({
      status: "success",
      data: {
        sentiment: result,
      },
    });
  } catch (error) {
    console.error("Error in analyzeText:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get sentiment statistics
export const getSentimentStats = async (req: Request, res: Response) => {
  try {
    const stats = await SentimentLogModel.getSentimentStats();

    return res.status(200).json({
      status: "success",
      data: {
        stats,
      },
    });
  } catch (error) {
    console.error("Error in getSentimentStats:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get sentiment logs by sentiment type
export const getSentimentLogsBySentiment = async (
  req: Request,
  res: Response
) => {
  try {
    const { sentiment } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!["positive", "negative", "neutral"].includes(sentiment)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid sentiment type",
      });
    }

    const logs = await SentimentLogModel.getBySentiment(
      sentiment,
      limit,
      offset
    );

    return res.status(200).json({
      status: "success",
      data: {
        logs,
        count: logs.length,
      },
    });
  } catch (error) {
    console.error("Error in getSentimentLogsBySentiment:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get sentiment logs by category
export const getSentimentLogsByCategory = async (
  req: Request,
  res: Response
) => {
  try {
    const { category } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const logs = await SentimentLogModel.getByCategory(category, limit, offset);

    return res.status(200).json({
      status: "success",
      data: {
        logs,
        count: logs.length,
      },
    });
  } catch (error) {
    console.error("Error in getSentimentLogsByCategory:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get sentiment logs by language
export const getSentimentLogsByLanguage = async (
  req: Request,
  res: Response
) => {
  try {
    const { language } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!["amharic", "english"].includes(language)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid language",
      });
    }

    const logs = await SentimentLogModel.getByLanguage(language, limit, offset);

    return res.status(200).json({
      status: "success",
      data: {
        logs,
        count: logs.length,
      },
    });
  } catch (error) {
    console.error("Error in getSentimentLogsByLanguage:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Get sentiment keywords from real review data
export const getSentimentKeywords = async (req: Request, res: Response) => {
  try {
    const officeId = req.query.office_id as string;

    // Build query to get review comments with sentiment data
    let query = `
      SELECT r.comment, sl.sentiment
      FROM reviews r
      LEFT JOIN sentiment_logs sl ON r.review_id = sl.review_id
      WHERE r.comment IS NOT NULL AND r.comment != ''
      AND sl.sentiment IS NOT NULL
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Add office filter if provided
    if (officeId) {
      query += ` AND r.office_id = $${paramIndex}`;
      params.push(officeId);
      paramIndex++;
    }

    query += ` ORDER BY r.created_at DESC LIMIT 1000`;

    const result = await pool.query(query, params);
    const reviews = result.rows;

    // Extract keywords from comments
    const positiveKeywords: { [key: string]: number } = {};
    const neutralKeywords: { [key: string]: number } = {};
    const negativeKeywords: { [key: string]: number } = {};

    // Define keyword patterns for extraction
    const positiveWords = [
      "good",
      "great",
      "excellent",
      "amazing",
      "wonderful",
      "fantastic",
      "helpful",
      "friendly",
      "efficient",
      "quick",
      "fast",
      "professional",
      "satisfied",
      "happy",
      "pleased",
      "impressed",
      "thank",
      "appreciate",
      "clean",
      "organized",
      "polite",
      "courteous",
      "timely",
      "smooth",
    ];

    const neutralWords = [
      "average",
      "okay",
      "standard",
      "normal",
      "expected",
      "regular",
      "usual",
      "typical",
      "moderate",
      "acceptable",
      "adequate",
      "fair",
    ];

    const negativeWords = [
      "bad",
      "poor",
      "terrible",
      "horrible",
      "awful",
      "disappointing",
      "unhelpful",
      "unfriendly",
      "inefficient",
      "slow",
      "unprofessional",
      "dissatisfied",
      "unhappy",
      "displeased",
      "unimpressed",
      "rude",
      "corrupt",
      "bribe",
      "waste",
      "long",
      "wait",
      "complicated",
      "confusing",
      "delayed",
      "dirty",
      "disorganized",
      "chaotic",
    ];

    // Process each review
    reviews.forEach((review: any) => {
      const comment = review.comment.toLowerCase();
      const sentiment = review.sentiment;

      // Extract keywords based on sentiment
      if (sentiment === "positive") {
        positiveWords.forEach((word) => {
          if (comment.includes(word)) {
            positiveKeywords[word] = (positiveKeywords[word] || 0) + 1;
          }
        });
      } else if (sentiment === "neutral") {
        neutralWords.forEach((word) => {
          if (comment.includes(word)) {
            neutralKeywords[word] = (neutralKeywords[word] || 0) + 1;
          }
        });
      } else if (sentiment === "negative") {
        negativeWords.forEach((word) => {
          if (comment.includes(word)) {
            negativeKeywords[word] = (negativeKeywords[word] || 0) + 1;
          }
        });
      }
    });

    // Sort keywords by frequency and get top 5 for each sentiment
    const getTopKeywords = (keywords: { [key: string]: number }) => {
      return Object.entries(keywords)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([keyword, count]) => ({ keyword, count }));
    };

    const topPositive = getTopKeywords(positiveKeywords);
    const topNeutral = getTopKeywords(neutralKeywords);
    const topNegative = getTopKeywords(negativeKeywords);

    return res.status(200).json({
      status: "success",
      data: {
        positive: topPositive,
        neutral: topNeutral,
        negative: topNegative,
        total_reviews_analyzed: reviews.length,
      },
    });
  } catch (error) {
    console.error("Error in getSentimentKeywords:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

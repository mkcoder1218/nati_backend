import { Request, Response } from 'express';
import SentimentLogModel from '../models/sentimentLog.model';
import { analyzeSentiment } from '../services/sentiment.service';

// Analyze text sentiment
export const analyzeText = async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({
        status: 'error',
        message: 'Text is required',
      });
    }
    
    const result = await analyzeSentiment(text);
    
    return res.status(200).json({
      status: 'success',
      data: {
        sentiment: result,
      },
    });
  } catch (error) {
    console.error('Error in analyzeText:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};

// Get sentiment statistics
export const getSentimentStats = async (req: Request, res: Response) => {
  try {
    const stats = await SentimentLogModel.getSentimentStats();
    
    return res.status(200).json({
      status: 'success',
      data: {
        stats,
      },
    });
  } catch (error) {
    console.error('Error in getSentimentStats:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};

// Get sentiment logs by sentiment type
export const getSentimentLogsBySentiment = async (req: Request, res: Response) => {
  try {
    const { sentiment } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    
    if (!['positive', 'negative', 'neutral'].includes(sentiment)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid sentiment type',
      });
    }
    
    const logs = await SentimentLogModel.getBySentiment(sentiment, limit, offset);
    
    return res.status(200).json({
      status: 'success',
      data: {
        logs,
        count: logs.length,
      },
    });
  } catch (error) {
    console.error('Error in getSentimentLogsBySentiment:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};

// Get sentiment logs by category
export const getSentimentLogsByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const logs = await SentimentLogModel.getByCategory(category, limit, offset);
    
    return res.status(200).json({
      status: 'success',
      data: {
        logs,
        count: logs.length,
      },
    });
  } catch (error) {
    console.error('Error in getSentimentLogsByCategory:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};

// Get sentiment logs by language
export const getSentimentLogsByLanguage = async (req: Request, res: Response) => {
  try {
    const { language } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    
    if (!['amharic', 'english'].includes(language)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid language',
      });
    }
    
    const logs = await SentimentLogModel.getByLanguage(language, limit, offset);
    
    return res.status(200).json({
      status: 'success',
      data: {
        logs,
        count: logs.length,
      },
    });
  } catch (error) {
    console.error('Error in getSentimentLogsByLanguage:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};

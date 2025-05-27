/**
 * Sentiment Analysis Service
 * 
 * This is a placeholder implementation for sentiment analysis.
 * In a production environment, this would be replaced with a more sophisticated
 * natural language processing solution, such as:
 * - Integration with a cloud NLP service (Google Cloud NLP, AWS Comprehend, Azure Text Analytics)
 * - A local NLP library with Amharic language support
 * - A custom-trained model for domain-specific sentiment analysis
 */

interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  category?: string;
  confidence: number;
  language: 'amharic' | 'english';
}

// Simple language detection (very basic implementation)
const detectLanguage = (text: string): 'amharic' | 'english' => {
  // Amharic Unicode range: \u1200-\u137F
  const amharicPattern = /[\u1200-\u137F]/;
  
  return amharicPattern.test(text) ? 'amharic' : 'english';
};

// Simple category detection based on keywords
const detectCategory = (text: string, language: 'amharic' | 'english'): string | undefined => {
  const lowerText = text.toLowerCase();
  
  // English categories
  if (language === 'english') {
    if (lowerText.includes('wait') || lowerText.includes('time') || lowerText.includes('queue') || lowerText.includes('long')) {
      return 'waiting_time';
    }
    
    if (lowerText.includes('staff') || lowerText.includes('employee') || lowerText.includes('officer') || lowerText.includes('service')) {
      return 'staff_behavior';
    }
    
    if (lowerText.includes('corrupt') || lowerText.includes('bribe') || lowerText.includes('money') || lowerText.includes('pay')) {
      return 'corruption';
    }
    
    if (lowerText.includes('clean') || lowerText.includes('facility') || lowerText.includes('building') || lowerText.includes('toilet')) {
      return 'facility_condition';
    }
    
    if (lowerText.includes('process') || lowerText.includes('procedure') || lowerText.includes('bureaucracy') || lowerText.includes('paperwork')) {
      return 'process_complexity';
    }
  }
  
  // Amharic categories (simplified for demonstration)
  if (language === 'amharic') {
    // These would be replaced with actual Amharic keywords
    if (lowerText.includes('ጊዜ') || lowerText.includes('መጠበቅ') || lowerText.includes('ረጅም')) {
      return 'waiting_time';
    }
    
    if (lowerText.includes('ሰራተኛ') || lowerText.includes('አገልግሎት')) {
      return 'staff_behavior';
    }
    
    if (lowerText.includes('ሙስና') || lowerText.includes('ጉቦ')) {
      return 'corruption';
    }
  }
  
  return undefined;
};

// Simple sentiment analysis based on keywords
const analyzeSentimentText = (text: string, language: 'amharic' | 'english'): { sentiment: 'positive' | 'negative' | 'neutral', confidence: number } => {
  const lowerText = text.toLowerCase();
  
  // English sentiment analysis
  if (language === 'english') {
    // Positive keywords
    const positiveWords = [
      'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
      'helpful', 'friendly', 'efficient', 'quick', 'fast', 'professional',
      'satisfied', 'happy', 'pleased', 'impressed', 'thank', 'appreciate'
    ];
    
    // Negative keywords
    const negativeWords = [
      'bad', 'poor', 'terrible', 'horrible', 'awful', 'disappointing',
      'unhelpful', 'unfriendly', 'inefficient', 'slow', 'unprofessional',
      'dissatisfied', 'unhappy', 'displeased', 'unimpressed', 'rude',
      'corrupt', 'bribe', 'waste', 'long wait', 'complicated'
    ];
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    // Count positive and negative words
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) {
        positiveScore++;
      }
    });
    
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) {
        negativeScore++;
      }
    });
    
    // Calculate sentiment
    if (positiveScore > negativeScore) {
      return { 
        sentiment: 'positive', 
        confidence: Math.min(0.5 + (positiveScore - negativeScore) * 0.1, 0.95) 
      };
    } else if (negativeScore > positiveScore) {
      return { 
        sentiment: 'negative', 
        confidence: Math.min(0.5 + (negativeScore - positiveScore) * 0.1, 0.95) 
      };
    } else {
      return { sentiment: 'neutral', confidence: 0.6 };
    }
  }
  
  // Amharic sentiment analysis (simplified for demonstration)
  if (language === 'amharic') {
    // These would be replaced with actual Amharic keywords
    const positiveWords = ['ጥሩ', 'ደስ', 'አመሰግናለሁ', 'ፈጣን'];
    const negativeWords = ['መጥፎ', 'አስቸጋሪ', 'ዘገየ', 'ሙስና'];
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    // Count positive and negative words
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) {
        positiveScore++;
      }
    });
    
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) {
        negativeScore++;
      }
    });
    
    // Calculate sentiment
    if (positiveScore > negativeScore) {
      return { 
        sentiment: 'positive', 
        confidence: Math.min(0.5 + (positiveScore - negativeScore) * 0.1, 0.95) 
      };
    } else if (negativeScore > positiveScore) {
      return { 
        sentiment: 'negative', 
        confidence: Math.min(0.5 + (negativeScore - positiveScore) * 0.1, 0.95) 
      };
    } else {
      return { sentiment: 'neutral', confidence: 0.6 };
    }
  }
  
  // Default fallback
  return { sentiment: 'neutral', confidence: 0.5 };
};

// Main sentiment analysis function
export const analyzeSentiment = async (text: string): Promise<SentimentResult> => {
  // Detect language
  const language = detectLanguage(text);
  
  // Analyze sentiment
  const { sentiment, confidence } = analyzeSentimentText(text, language);
  
  // Detect category
  const category = detectCategory(text, language);
  
  return {
    sentiment,
    category,
    confidence,
    language,
  };
};

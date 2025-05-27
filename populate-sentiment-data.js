require('dotenv').config();
const { Pool } = require('pg');

// Create database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'government_feedback',
});

async function populateSentimentData() {
  const client = await pool.connect();

  try {
    console.log("🔗 Connected to database");

    // First, check if we have reviews without sentiment analysis
    const reviewsWithoutSentiment = await client.query(`
      SELECT r.review_id, r.comment, r.rating
      FROM reviews r
      LEFT JOIN sentiment_logs sl ON r.review_id = sl.review_id
      WHERE r.comment IS NOT NULL 
        AND r.comment != ''
        AND sl.review_id IS NULL
      LIMIT 50
    `);

    console.log(`📊 Found ${reviewsWithoutSentiment.rows.length} reviews without sentiment analysis`);

    if (reviewsWithoutSentiment.rows.length === 0) {
      console.log("✅ All reviews already have sentiment analysis");
      
      // Check current sentiment distribution
      const sentimentStats = await client.query(`
        SELECT 
          sl.sentiment,
          COUNT(*) as count
        FROM sentiment_logs sl
        JOIN reviews r ON sl.review_id = r.review_id
        GROUP BY sl.sentiment
        ORDER BY sl.sentiment
      `);
      
      console.log("📈 Current sentiment distribution:");
      sentimentStats.rows.forEach(row => {
        console.log(`  ${row.sentiment}: ${row.count} reviews`);
      });
      
      return;
    }

    // Function to analyze sentiment based on rating and comment
    function analyzeSentiment(comment, rating) {
      const lowerComment = comment.toLowerCase();
      
      // Positive indicators
      const positiveWords = [
        'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'perfect',
        'helpful', 'friendly', 'professional', 'efficient', 'quick', 'fast',
        'satisfied', 'happy', 'pleased', 'recommend', 'love', 'awesome'
      ];
      
      // Negative indicators
      const negativeWords = [
        'bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'disgusting',
        'slow', 'rude', 'unprofessional', 'corrupt', 'bribe', 'delay', 'waiting',
        'problem', 'issue', 'complaint', 'disappointed', 'frustrated', 'angry'
      ];
      
      // Category indicators
      const categories = {
        waiting_time: ['wait', 'waiting', 'slow', 'delay', 'time', 'queue', 'long'],
        staff_behavior: ['rude', 'unprofessional', 'helpful', 'friendly', 'staff', 'employee'],
        corruption: ['bribe', 'corrupt', 'money', 'pay', 'under table'],
        facility_condition: ['building', 'office', 'clean', 'dirty', 'condition', 'facility'],
        process_complexity: ['complex', 'difficult', 'easy', 'simple', 'process', 'procedure'],
        documentation: ['document', 'paper', 'form', 'certificate', 'id'],
        service_availability: ['available', 'closed', 'open', 'service', 'hours'],
        information_clarity: ['information', 'clear', 'confusing', 'explain', 'understand']
      };
      
      let positiveScore = 0;
      let negativeScore = 0;
      
      // Count positive and negative words
      positiveWords.forEach(word => {
        if (lowerComment.includes(word)) positiveScore++;
      });
      
      negativeWords.forEach(word => {
        if (lowerComment.includes(word)) negativeScore++;
      });
      
      // Determine sentiment based on rating and word analysis
      let sentiment;
      let confidence;
      
      if (rating >= 4 && positiveScore > negativeScore) {
        sentiment = 'positive';
        confidence = Math.min(0.7 + (positiveScore * 0.1), 0.95);
      } else if (rating <= 2 || negativeScore > positiveScore) {
        sentiment = 'negative';
        confidence = Math.min(0.7 + (negativeScore * 0.1), 0.95);
      } else {
        sentiment = 'neutral';
        confidence = 0.6;
      }
      
      // Determine category
      let category = null;
      let maxCategoryScore = 0;
      
      Object.entries(categories).forEach(([cat, words]) => {
        let score = 0;
        words.forEach(word => {
          if (lowerComment.includes(word)) score++;
        });
        if (score > maxCategoryScore) {
          maxCategoryScore = score;
          category = cat;
        }
      });
      
      return {
        sentiment,
        category,
        confidence,
        language: /[ሀ-፿]/.test(comment) ? 'amharic' : 'english'
      };
    }

    // Process each review and create sentiment logs
    let processedCount = 0;
    
    for (const review of reviewsWithoutSentiment.rows) {
      try {
        const analysis = analyzeSentiment(review.comment, review.rating);
        
        await client.query(`
          INSERT INTO sentiment_logs (
            review_id, 
            sentiment, 
            category, 
            confidence_score, 
            language
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          review.review_id,
          analysis.sentiment,
          analysis.category,
          analysis.confidence,
          analysis.language
        ]);
        
        processedCount++;
        
        if (processedCount % 10 === 0) {
          console.log(`📝 Processed ${processedCount} reviews...`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing review ${review.review_id}:`, error.message);
      }
    }
    
    console.log(`✅ Successfully processed ${processedCount} reviews`);
    
    // Show final sentiment distribution
    const finalStats = await client.query(`
      SELECT 
        sl.sentiment,
        COUNT(*) as count,
        ROUND(AVG(sl.confidence_score), 2) as avg_confidence
      FROM sentiment_logs sl
      JOIN reviews r ON sl.review_id = r.review_id
      GROUP BY sl.sentiment
      ORDER BY sl.sentiment
    `);
    
    console.log("\n📈 Final sentiment distribution:");
    let total = 0;
    finalStats.rows.forEach(row => {
      total += parseInt(row.count);
      console.log(`  ${row.sentiment}: ${row.count} reviews (avg confidence: ${row.avg_confidence})`);
    });
    console.log(`  Total: ${total} reviews with sentiment analysis`);
    
    // Show category distribution
    const categoryStats = await client.query(`
      SELECT 
        sl.category,
        COUNT(*) as count
      FROM sentiment_logs sl
      JOIN reviews r ON sl.review_id = r.review_id
      WHERE sl.category IS NOT NULL
      GROUP BY sl.category
      ORDER BY count DESC
      LIMIT 10
    `);
    
    console.log("\n📊 Top categories:");
    categoryStats.rows.forEach(row => {
      console.log(`  ${row.category}: ${row.count} reviews`);
    });
    
  } catch (error) {
    console.error("💥 Error populating sentiment data:", error);
    throw error;
  } finally {
    await client.release();
    await pool.end();
  }
}

// Run the script
populateSentimentData()
  .then(() => {
    console.log("\n🎉 Sentiment data population completed!");
    console.log("📊 Reports will now use real sentiment data from the database.");
    process.exit(0);
  })
  .catch(error => {
    console.error("\n💥 Sentiment data population failed:", error);
    process.exit(1);
  });

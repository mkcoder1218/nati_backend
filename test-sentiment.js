const { Pool } = require("pg");

const pool = new Pool({
  connectionString:
    "postgresql://natitest_owner:npg_WEcYKfn7V0kv@ep-shy-bush-a8gjm6xp-pooler.eastus2.azure.neon.tech/natitest?sslmode=require",
});

async function testSentimentData() {
  try {
    console.log("=== Testing Sentiment Data ===\n");

    // Check if sentiment_logs table exists
    console.log("1. Checking sentiment_logs table...");
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'sentiment_logs'
      );
    `);
    console.log("Sentiment logs table exists:", tableCheck.rows[0].exists);

    if (tableCheck.rows[0].exists) {
      // Check sentiment data
      console.log("\n2. Checking sentiment data...");
      const sentimentData = await pool.query(
        "SELECT sentiment, COUNT(*) as count FROM sentiment_logs GROUP BY sentiment"
      );
      console.log("Sentiment breakdown:", sentimentData.rows);

      // Check total count
      const totalCount = await pool.query(
        "SELECT COUNT(*) as total FROM sentiment_logs"
      );
      console.log("Total sentiment logs:", totalCount.rows[0].total);

      // Check recent entries
      console.log("\n3. Recent sentiment entries...");
      const recentEntries = await pool.query(
        "SELECT * FROM sentiment_logs ORDER BY processed_at DESC LIMIT 5"
      );
      console.log("Recent entries:", recentEntries.rows);
    } else {
      console.log(
        "Sentiment logs table does not exist. Creating some test data..."
      );

      // Create table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS sentiment_logs (
          log_id VARCHAR(255) PRIMARY KEY,
          review_id VARCHAR(255),
          sentiment VARCHAR(50) NOT NULL,
          category VARCHAR(100),
          confidence_score DECIMAL(3,2),
          processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          language VARCHAR(50) DEFAULT 'english'
        );
      `);

      // Insert some test data
      const testData = [
        { sentiment: "positive", count: 15 },
        { sentiment: "neutral", count: 8 },
        { sentiment: "negative", count: 5 },
      ];

      for (const data of testData) {
        for (let i = 0; i < data.count; i++) {
          await pool.query(
            `
            INSERT INTO sentiment_logs (log_id, review_id, sentiment, confidence_score, language)
            VALUES ($1, $2, $3, $4, $5)
          `,
            [
              `test-${data.sentiment}-${i}`,
              `review-${i}`,
              data.sentiment,
              Math.random() * 0.5 + 0.5, // Random confidence between 0.5 and 1.0
              Math.random() > 0.5 ? "english" : "amharic",
            ]
          );
        }
      }

      console.log("Test sentiment data created!");

      // Check the created data
      const newSentimentData = await pool.query(
        "SELECT sentiment, COUNT(*) as count FROM sentiment_logs GROUP BY sentiment"
      );
      console.log("Created sentiment breakdown:", newSentimentData.rows);
    }

    // Test the API endpoint
    console.log("\n4. Testing sentiment stats API...");
    try {
      const axios = require("axios");
      const response = await axios.get(
        "http://localhost:5002/api/sentiment/stats",
        {
          headers: {
            Authorization: "Bearer test-token", // Add a test token
          },
        }
      );
      console.log("API Response Status:", response.status);
      console.log("API Response:", JSON.stringify(response.data, null, 2));

      // Test the data format
      const stats = response.data.data.stats;
      console.log("\n=== Sentiment Stats Analysis ===");
      console.log("Positive:", stats.positive);
      console.log("Neutral:", stats.neutral);
      console.log("Negative:", stats.negative);
      console.log("Total:", stats.total);

      if (stats.total > 0) {
        console.log("\n=== Percentages ===");
        console.log(
          "Positive:",
          Math.round((stats.positive / stats.total) * 100) + "%"
        );
        console.log(
          "Neutral:",
          Math.round((stats.neutral / stats.total) * 100) + "%"
        );
        console.log(
          "Negative:",
          Math.round((stats.negative / stats.total) * 100) + "%"
        );
      }
    } catch (apiError) {
      console.log(
        "API test failed:",
        apiError.response?.status,
        apiError.response?.data || apiError.message
      );
    }

    await pool.end();
    console.log("\n=== Test Complete ===");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

testSentimentData();

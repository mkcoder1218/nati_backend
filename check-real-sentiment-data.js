require("dotenv").config();
const { Pool } = require("pg");

// Create database connection with SSL support for Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL_NEON || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  min: 1,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 30000,
});

async function checkRealSentimentData() {
  const client = await pool.connect();

  try {
    console.log("🔗 Connected to database");
    console.log("🔍 Checking for real sentiment data...\n");

    // Check if sentiment_logs table exists
    const tableCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'sentiment_logs'
    `);

    if (tableCheck.rows.length === 0) {
      console.log("❌ sentiment_logs table does not exist!");
      console.log("   Run the database migrations first.");
      return;
    }

    console.log("✅ sentiment_logs table exists");

    // Check total reviews
    const totalReviews = await client.query(`
      SELECT COUNT(*) as count FROM reviews
    `);
    console.log(`📊 Total reviews in database: ${totalReviews.rows[0].count}`);

    // Check reviews with comments
    const reviewsWithComments = await client.query(`
      SELECT COUNT(*) as count FROM reviews WHERE comment IS NOT NULL AND comment != ''
    `);
    console.log(
      `💬 Reviews with comments: ${reviewsWithComments.rows[0].count}`
    );

    // Check total sentiment logs
    const totalSentimentLogs = await client.query(`
      SELECT COUNT(*) as count FROM sentiment_logs
    `);
    console.log(`🧠 Total sentiment logs: ${totalSentimentLogs.rows[0].count}`);

    // Check sentiment breakdown
    const sentimentBreakdown = await client.query(`
      SELECT
        sl.sentiment,
        COUNT(*) as count
      FROM sentiment_logs sl
      JOIN reviews r ON sl.review_id = r.review_id
      GROUP BY sl.sentiment
      ORDER BY sl.sentiment
    `);

    if (sentimentBreakdown.rows.length > 0) {
      console.log("\n📈 Real sentiment breakdown:");
      let total = 0;
      sentimentBreakdown.rows.forEach((row) => {
        total += parseInt(row.count);
        console.log(`  ${row.sentiment}: ${row.count} reviews`);
      });
      console.log(`  Total: ${total} reviews with sentiment analysis`);
    } else {
      console.log("\n❌ No sentiment data found!");
    }

    // Check categories
    const categoryBreakdown = await client.query(`
      SELECT
        sl.category,
        COUNT(*) as count
      FROM sentiment_logs sl
      JOIN reviews r ON sl.review_id = r.review_id
      WHERE sl.category IS NOT NULL AND sl.category != ''
      GROUP BY sl.category
      ORDER BY count DESC
      LIMIT 10
    `);

    if (categoryBreakdown.rows.length > 0) {
      console.log("\n📊 Top issue categories:");
      categoryBreakdown.rows.forEach((row) => {
        console.log(`  ${row.category}: ${row.count} reviews`);
      });
    } else {
      console.log("\n❌ No category data found!");
    }

    // Check sample reviews with sentiment
    const sampleReviews = await client.query(`
      SELECT
        r.comment,
        sl.sentiment,
        sl.category,
        sl.confidence_score
      FROM reviews r
      JOIN sentiment_logs sl ON r.review_id = sl.review_id
      WHERE r.comment IS NOT NULL AND r.comment != ''
      ORDER BY r.created_at DESC
      LIMIT 5
    `);

    if (sampleReviews.rows.length > 0) {
      console.log("\n📝 Sample reviews with sentiment analysis:");
      sampleReviews.rows.forEach((row, index) => {
        console.log(
          `\n  ${index + 1}. Comment: "${row.comment.substring(0, 100)}${
            row.comment.length > 100 ? "..." : ""
          }"`
        );
        console.log(
          `     Sentiment: ${row.sentiment} (confidence: ${row.confidence_score})`
        );
        console.log(`     Category: ${row.category || "N/A"}`);
      });
    } else {
      console.log("\n❌ No reviews with sentiment analysis found!");
    }

    // Test the exact query used in reports
    console.log("\n🧪 Testing report query...");
    const reportQuery = await client.query(`
      SELECT
        sl.sentiment,
        COUNT(*) as count
      FROM sentiment_logs sl
      JOIN reviews r ON sl.review_id = r.review_id
      WHERE r.status = 'approved'
      GROUP BY sl.sentiment
    `);

    if (reportQuery.rows.length > 0) {
      console.log("✅ Report query works! Results:");
      reportQuery.rows.forEach((row) => {
        console.log(`  ${row.sentiment}: ${row.count} reviews`);
      });
    } else {
      console.log("❌ Report query returned no results!");
      console.log("   This means reports will show empty data.");

      // Check if there are any approved reviews
      const approvedReviews = await client.query(`
        SELECT COUNT(*) as count FROM reviews WHERE status = 'approved'
      `);
      console.log(`   Approved reviews: ${approvedReviews.rows[0].count}`);

      if (approvedReviews.rows[0].count === 0) {
        console.log("   💡 Tip: You may need to approve some reviews first!");
      }
    }
  } catch (error) {
    console.error("💥 Error checking sentiment data:", error);
  } finally {
    await client.release();
    await pool.end();
  }
}

// Run the check
checkRealSentimentData()
  .then(() => {
    console.log("\n🎉 Sentiment data check completed!");
  })
  .catch((error) => {
    console.error("\n💥 Sentiment data check failed:", error);
    process.exit(1);
  });

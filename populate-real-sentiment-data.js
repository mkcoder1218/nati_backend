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

async function populateRealSentimentData() {
  const client = await pool.connect();

  try {
    console.log("🔗 Connected to database");
    console.log("🚀 Populating real sentiment data...\n");

    // First, approve all existing reviews
    const approveResult = await client.query(`
      UPDATE reviews SET status = 'approved' WHERE status != 'approved'
    `);
    console.log(`✅ Approved ${approveResult.rowCount} existing reviews`);

    // Get a sample citizen user
    const citizenResult = await client.query(`
      SELECT user_id FROM users WHERE role = 'citizen' LIMIT 1
    `);

    if (citizenResult.rows.length === 0) {
      console.log("❌ No citizen users found. Creating a sample citizen...");

      // Create a sample citizen user
      const newCitizenResult = await client.query(`
        INSERT INTO users (user_id, full_name, email, phone_number, password_hash, role, status, created_at)
        VALUES (gen_random_uuid(), 'Sample Citizen', 'citizen@example.com', '0911234567', '$2a$10$example', 'citizen', 'active', NOW())
        RETURNING user_id
      `);

      console.log(
        `✅ Created sample citizen user: ${newCitizenResult.rows[0].user_id}`
      );
    }

    const citizenUserId =
      citizenResult.rows[0]?.user_id ||
      (
        await client.query(`
      SELECT user_id FROM users WHERE role = 'citizen' LIMIT 1
    `)
      ).rows[0].user_id;

    // Get available offices
    const officesResult = await client.query(`
      SELECT office_id, name as office_name FROM offices LIMIT 5
    `);

    if (officesResult.rows.length === 0) {
      console.log("❌ No offices found. Please create some offices first.");
      return;
    }

    console.log(
      `📍 Found ${officesResult.rows.length} offices to add reviews for`
    );

    // Sample reviews with realistic sentiment data
    const sampleReviews = [
      {
        rating: 5,
        comment:
          "Excellent service! The staff was very helpful and professional. I got my documents processed quickly without any hassle.",
        sentiment: "positive",
        category: "staff_behavior",
        confidence: 0.95,
      },
      {
        rating: 4,
        comment:
          "Good service overall, but the waiting time was a bit long. The staff was friendly though.",
        sentiment: "positive",
        category: "waiting_time",
        confidence: 0.78,
      },
      {
        rating: 2,
        comment:
          "Very disappointing experience. Had to wait for hours and the staff was rude. The process is too complicated.",
        sentiment: "negative",
        category: "staff_behavior",
        confidence: 0.92,
      },
      {
        rating: 1,
        comment:
          "Terrible service! Corruption is evident here. They asked for extra money to process my documents faster.",
        sentiment: "negative",
        category: "corruption",
        confidence: 0.98,
      },
      {
        rating: 3,
        comment:
          "Average experience. Nothing special, but got the job done eventually. Could be improved.",
        sentiment: "neutral",
        category: "service_quality",
        confidence: 0.65,
      },
      {
        rating: 5,
        comment:
          "Outstanding! The new digital system makes everything so much easier. Highly recommend this office.",
        sentiment: "positive",
        category: "online_system",
        confidence: 0.89,
      },
      {
        rating: 2,
        comment:
          "The office facilities are in poor condition. Chairs are broken and the place needs renovation.",
        sentiment: "negative",
        category: "facility_condition",
        confidence: 0.85,
      },
      {
        rating: 4,
        comment:
          "Staff is knowledgeable and helpful. The only issue is the complex documentation requirements.",
        sentiment: "positive",
        category: "documentation",
        confidence: 0.72,
      },
      {
        rating: 1,
        comment:
          "Worst experience ever! No clear information provided and staff doesn't speak English well.",
        sentiment: "negative",
        category: "language_barrier",
        confidence: 0.88,
      },
      {
        rating: 3,
        comment:
          "Okay service. Not great, not terrible. The process took longer than expected but was completed.",
        sentiment: "neutral",
        category: "process_complexity",
        confidence: 0.58,
      },
      {
        rating: 5,
        comment:
          "Amazing transformation! This office has really improved over the past year. Keep up the good work!",
        sentiment: "positive",
        category: "service_quality",
        confidence: 0.94,
      },
      {
        rating: 2,
        comment:
          "Service is available only during limited hours. Very inconvenient for working people.",
        sentiment: "negative",
        category: "service_availability",
        confidence: 0.81,
      },
      {
        rating: 4,
        comment:
          "Good service and friendly staff. The waiting area is comfortable and clean.",
        sentiment: "positive",
        category: "facility_condition",
        confidence: 0.76,
      },
      {
        rating: 3,
        comment:
          "The information provided was not very clear. Had to ask multiple times to understand the process.",
        sentiment: "neutral",
        category: "information_clarity",
        confidence: 0.69,
      },
      {
        rating: 5,
        comment:
          "Perfect service! Quick, efficient, and professional. This is how government services should be.",
        sentiment: "positive",
        category: "service_quality",
        confidence: 0.97,
      },
    ];

    let totalCreated = 0;

    // Create reviews for each office
    for (const office of officesResult.rows) {
      console.log(`\n📝 Creating reviews for ${office.office_name}...`);

      // Create 3-5 reviews per office
      const reviewsToCreate = sampleReviews.slice(
        0,
        Math.floor(Math.random() * 3) + 3
      );

      for (const reviewData of reviewsToCreate) {
        try {
          // Insert review
          const reviewResult = await client.query(
            `
            INSERT INTO reviews (user_id, office_id, rating, comment, created_at, status)
            VALUES ($1, $2, $3, $4, NOW() - INTERVAL '${Math.floor(
              Math.random() * 30
            )} days', 'approved')
            RETURNING review_id
          `,
            [
              citizenUserId,
              office.office_id,
              reviewData.rating,
              reviewData.comment,
            ]
          );

          const reviewId = reviewResult.rows[0].review_id;

          // Insert sentiment log
          await client.query(
            `
            INSERT INTO sentiment_logs (review_id, sentiment, category, confidence_score, language, processed_at)
            VALUES ($1, $2, $3, $4, 'english', NOW())
          `,
            [
              reviewId,
              reviewData.sentiment,
              reviewData.category,
              reviewData.confidence,
            ]
          );

          totalCreated++;
        } catch (error) {
          console.log(`⚠️ Skipped duplicate review: ${error.message}`);
        }
      }
    }

    console.log(
      `\n✅ Created ${totalCreated} new reviews with sentiment analysis`
    );

    // Check final statistics
    const finalStats = await client.query(`
      SELECT
        sl.sentiment,
        COUNT(*) as count
      FROM sentiment_logs sl
      JOIN reviews r ON sl.review_id = r.review_id
      WHERE r.status = 'approved'
      GROUP BY sl.sentiment
      ORDER BY sl.sentiment
    `);

    console.log("\n📊 Final sentiment breakdown:");
    let total = 0;
    finalStats.rows.forEach((row) => {
      total += parseInt(row.count);
      console.log(`  ${row.sentiment}: ${row.count} reviews`);
    });
    console.log(`  Total: ${total} reviews with sentiment analysis`);

    // Check categories
    const categoryStats = await client.query(`
      SELECT
        sl.category,
        COUNT(*) as count
      FROM sentiment_logs sl
      JOIN reviews r ON sl.review_id = r.review_id
      WHERE r.status = 'approved' AND sl.category IS NOT NULL
      GROUP BY sl.category
      ORDER BY count DESC
      LIMIT 10
    `);

    console.log("\n📈 Top issue categories:");
    categoryStats.rows.forEach((row) => {
      console.log(`  ${row.category}: ${row.count} reviews`);
    });
  } catch (error) {
    console.error("💥 Error populating sentiment data:", error);
  } finally {
    await client.release();
    await pool.end();
  }
}

// Run the population
populateRealSentimentData()
  .then(() => {
    console.log("\n🎉 Sentiment data population completed!");
  })
  .catch((error) => {
    console.error("\n💥 Sentiment data population failed:", error);
    process.exit(1);
  });

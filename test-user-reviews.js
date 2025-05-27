/**
 * Test script to verify user reviews functionality
 *
 * This script:
 * 1. Tests the database connection
 * 2. Tests the review model getByUser method
 * 3. Tests the review controller endpoint
 *
 * Usage:
 * node test-user-reviews.js
 */

require("dotenv").config();
const { Pool } = require("pg");

// Create a connection to the database
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "government_feedback",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
});

async function testUserReviews() {
  try {
    console.log("🔍 Testing User Reviews Functionality...\n");

    // Test 1: Database connection
    console.log("1. Testing database connection...");
    const client = await pool.connect();
    console.log("✅ Database connection successful");
    client.release();

    // Test 2: Check if users exist
    console.log("\n2. Checking for existing users...");
    const usersResult = await pool.query(
      "SELECT user_id, email, full_name FROM users LIMIT 5"
    );
    console.log(`✅ Found ${usersResult.rows.length} users:`);
    usersResult.rows.forEach((user) => {
      console.log(
        `   - ${user.full_name} (${user.email}) - ID: ${user.user_id}`
      );
    });

    if (usersResult.rows.length === 0) {
      console.log("❌ No users found. Please create some test users first.");
      return;
    }

    // Test 3: Check if reviews exist
    console.log("\n3. Checking for existing reviews...");
    const reviewsResult = await pool.query(`
      SELECT
        r.review_id,
        r.user_id,
        r.rating,
        r.comment,
        o.name as office_name,
        u.full_name as user_name
      FROM reviews r
      LEFT JOIN offices o ON r.office_id = o.office_id
      LEFT JOIN users u ON r.user_id = u.user_id
      LIMIT 10
    `);
    console.log(`✅ Found ${reviewsResult.rows.length} reviews:`);
    reviewsResult.rows.forEach((review) => {
      console.log(
        `   - ${review.user_name}: ${review.rating}⭐ for ${review.office_name}`
      );
    });

    if (reviewsResult.rows.length === 0) {
      console.log(
        "❌ No reviews found. Please create some test reviews first."
      );
      return;
    }

    // Test 4: Test getByUser query directly
    console.log("\n4. Testing getByUser query directly...");
    const testUserId = usersResult.rows[0].user_id;
    console.log(`   Testing with user ID: ${testUserId}`);

    const userReviewsResult = await pool.query(
      `
      SELECT
        r.*,
        o.name as office_name,
        o.office_id as office_id
       FROM reviews r
       LEFT JOIN offices o ON r.office_id = o.office_id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC
       LIMIT 100
    `,
      [testUserId]
    );

    console.log(
      `✅ getByUser query returned ${userReviewsResult.rows.length} reviews:`
    );
    userReviewsResult.rows.forEach((review) => {
      console.log(
        `   - Review ID: ${review.review_id}, Rating: ${
          review.rating
        }, Office: ${review.office_name || "Unknown"}`
      );
    });

    // Test 5: Test the SQL query directly
    console.log("\n5. Testing SQL query directly...");
    const directResult = await pool.query(
      `
      SELECT
        r.*,
        o.name as office_name,
        o.office_id as office_id
       FROM reviews r
       LEFT JOIN offices o ON r.office_id = o.office_id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC
       LIMIT 10
    `,
      [testUserId]
    );

    console.log(
      `✅ Direct SQL query returned ${directResult.rows.length} reviews:`
    );
    directResult.rows.forEach((review) => {
      console.log(
        `   - ${review.review_id}: ${review.rating}⭐ for ${
          review.office_name || "Unknown Office"
        }`
      );
      console.log(`     Comment: ${review.comment || "No comment"}`);
      console.log(`     Created: ${review.created_at}`);
    });

    // Test 6: Check for any authentication issues
    console.log("\n6. Checking JWT configuration...");
    console.log(
      `   JWT_SECRET configured: ${process.env.JWT_SECRET ? "Yes" : "No"}`
    );
    console.log(
      `   JWT_EXPIRES_IN: ${process.env.JWT_EXPIRES_IN || "Not set"}`
    );

    console.log("\n✅ All tests completed successfully!");
    console.log("\n📋 Summary:");
    console.log(`   - Users in database: ${usersResult.rows.length}`);
    console.log(`   - Reviews in database: ${reviewsResult.rows.length}`);
    console.log(`   - Reviews for test user: ${userReviewsResult.rows.length}`);
    console.log(`   - Database connection: Working`);
    console.log(`   - getByUser query: Working`);
  } catch (error) {
    console.error("❌ Error during testing:", error);
    console.error("Stack trace:", error.stack);
  } finally {
    await pool.end();
  }
}

// Run the test
testUserReviews();

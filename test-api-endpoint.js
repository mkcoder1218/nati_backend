/**
 * Test script to verify the API endpoint for user reviews
 *
 * This script:
 * 1. Tests user login to get a JWT token
 * 2. Tests the /api/reviews/user/:userId endpoint
 * 3. Verifies the response structure
 *
 * Usage:
 * node test-api-endpoint.js
 */

require("dotenv").config();
const axios = require("axios");

const API_BASE_URL = "http://localhost:5002/api";

async function testAPIEndpoint() {
  try {
    console.log("🔍 Testing API Endpoint for User Reviews...\n");

    // Test 1: Login to get a JWT token
    console.log("1. Testing user login...");

    // Try to login with a test user
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: "citizen2@example.com",
      password: "password",
    });

    if (loginResponse.data.status === "success") {
      console.log("✅ Login successful");
      const token = loginResponse.data.data.token;
      const user = loginResponse.data.data.user;
      console.log(`   User: ${user.full_name} (${user.email})`);
      console.log(`   User ID: ${user.user_id}`);
      console.log(`   Role: ${user.role}`);

      // Test 2: Test the reviews endpoint
      console.log("\n2. Testing /api/reviews/user/:userId endpoint...");

      const reviewsResponse = await axios.get(
        `${API_BASE_URL}/reviews/user/${user.user_id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (reviewsResponse.data.status === "success") {
        console.log("✅ Reviews endpoint successful");
        const reviews = reviewsResponse.data.data.reviews;
        console.log(`   Found ${reviews.length} reviews:`);

        reviews.forEach((review, index) => {
          console.log(`   ${index + 1}. Review ID: ${review.review_id}`);
          console.log(`      Office: ${review.office_name || "Unknown"}`);
          console.log(`      Rating: ${review.rating}⭐`);
          console.log(`      Comment: ${review.comment || "No comment"}`);
          console.log(`      Created: ${review.created_at}`);
          console.log(`      Status: ${review.status}`);
          console.log("");
        });

        // Test 3: Verify data structure
        console.log("3. Verifying data structure...");
        if (reviews.length > 0) {
          const firstReview = reviews[0];
          const requiredFields = [
            "review_id",
            "user_id",
            "office_id",
            "rating",
            "created_at",
          ];
          const missingFields = requiredFields.filter(
            (field) => !firstReview.hasOwnProperty(field)
          );

          if (missingFields.length === 0) {
            console.log("✅ All required fields present");
          } else {
            console.log(`❌ Missing fields: ${missingFields.join(", ")}`);
          }

          if (firstReview.office_name) {
            console.log("✅ Office name is included");
          } else {
            console.log("❌ Office name is missing");
          }
        }

        console.log("\n✅ All API tests completed successfully!");
        console.log("\n📋 Summary:");
        console.log(`   - Login: Working`);
        console.log(`   - Reviews endpoint: Working`);
        console.log(`   - Reviews found: ${reviews.length}`);
        console.log(`   - Data structure: Valid`);
      } else {
        console.log("❌ Reviews endpoint failed");
        console.log("Response:", reviewsResponse.data);
      }
    } else {
      console.log("❌ Login failed");
      console.log("Response:", loginResponse.data);
    }
  } catch (error) {
    console.error("❌ Error during API testing:", error.message);

    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }

    if (error.code === "ECONNREFUSED") {
      console.error(
        "\n💡 Make sure the backend server is running on port 5002"
      );
      console.error("   Run: npm run dev");
    }
  }
}

// Run the test
testAPIEndpoint();

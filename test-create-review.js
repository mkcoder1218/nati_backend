const axios = require("axios");

async function testCreateReview() {
  try {
    console.log("🔍 Testing review creation with new status...");

    // First login to get a token
    const loginResponse = await axios.post(
      "http://localhost:5002/api/auth/login",
      {
        emailOrPhone: "citizen2@example.com",
        password: "password",
      }
    );

    const token = loginResponse.data.data.token;
    console.log("✅ Login successful");

    // Get first office
    const officesResponse = await axios.get(
      "http://localhost:5002/api/offices"
    );
    const firstOffice = officesResponse.data.data.offices[0];
    console.log("Testing with office:", firstOffice.name);

    // Create a new review
    const reviewData = {
      office_id: firstOffice.office_id,
      rating: 5,
      comment: "Test review with new auto-approval system",
      is_anonymous: false,
    };

    const createResponse = await axios.post(
      "http://localhost:5002/api/reviews",
      reviewData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const newReview = createResponse.data.data.review;
    console.log("✅ Review created successfully");
    console.log("Review ID:", newReview.review_id);
    console.log("Status:", newReview.status);
    console.log("Rating:", newReview.rating);
    console.log("Comment:", newReview.comment);

    // Verify the review appears in office reviews
    const reviewsResponse = await axios.get(
      `http://localhost:5002/api/reviews/office/${firstOffice.office_id}`
    );
    const reviews = reviewsResponse.data.data.reviews;

    const ourReview = reviews.find((r) => r.review_id === newReview.review_id);
    if (ourReview) {
      console.log("✅ Review found in office reviews");
      console.log("Status in list:", ourReview.status);
    } else {
      console.log("❌ Review not found in office reviews");
    }
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
  }
}

testCreateReview();

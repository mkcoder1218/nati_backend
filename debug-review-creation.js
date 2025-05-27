const axios = require("axios");

async function debugReviewCreation() {
  try {
    console.log("🔍 Debugging review creation process...\n");

    // Step 1: Check available users
    console.log("1. Checking available users...");
    const usersResponse = await axios.get("http://localhost:5002/api/offices");
    console.log("✅ API is responding\n");

    // Step 2: Try to login with different users
    const testUsers = [
      { email: "citizen1@example.com", password: "password" },
      { email: "citizen2@example.com", password: "password" },
      { email: "admin@example.com", password: "password" },
      { email: "official@example.com", password: "password" },
    ];

    let successfulLogin = null;

    for (const testUser of testUsers) {
      try {
        console.log(`2. Trying to login with ${testUser.email}...`);
        const loginResponse = await axios.post(
          "http://localhost:5002/api/auth/login",
          {
            email: testUser.email,
            password: testUser.password,
          }
        );

        console.log("✅ Login successful!");
        console.log("   User:", loginResponse.data.data.user.full_name);
        console.log("   Role:", loginResponse.data.data.user.role);
        console.log("   User ID:", loginResponse.data.data.user.user_id);

        successfulLogin = {
          token: loginResponse.data.data.token,
          user: loginResponse.data.data.user,
        };
        break;
      } catch (error) {
        console.log(
          `❌ Login failed for ${testUser.email}:`,
          error.response?.data?.message || error.message
        );
      }
    }

    if (!successfulLogin) {
      console.log(
        "❌ No successful login found. Cannot proceed with review creation test."
      );
      return;
    }

    console.log("\n3. Getting office information...");
    const officesResponse = await axios.get(
      "http://localhost:5002/api/offices"
    );
    const firstOffice = officesResponse.data.data.offices[0];
    console.log("✅ Office found:", firstOffice.name);
    console.log("   Office ID:", firstOffice.office_id);

    // Step 3: Create a review with authentication
    console.log("\n4. Creating review with authentication...");
    const reviewData = {
      office_id: firstOffice.office_id,
      rating: 5,
      comment: "Debug test review - checking user name display",
      is_anonymous: false, // This should show the user's name
    };

    console.log("   Review data:", reviewData);
    console.log("   Using token for user:", successfulLogin.user.full_name);

    try {
      const createResponse = await axios.post(
        "http://localhost:5002/api/reviews",
        reviewData,
        {
          headers: {
            Authorization: `Bearer ${successfulLogin.token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const newReview = createResponse.data.data.review;
      console.log("✅ Review created successfully!");
      console.log("   Review ID:", newReview.review_id);
      console.log("   User ID in review:", newReview.user_id);
      console.log("   Is anonymous:", newReview.is_anonymous);
      console.log("   Status:", newReview.status);
      console.log("   Rating:", newReview.rating);
      console.log("   Comment:", newReview.comment);

      // Step 4: Fetch the review back to see how it appears
      console.log("\n5. Fetching reviews for office to see how it displays...");
      const reviewsResponse = await axios.get(
        `http://localhost:5002/api/reviews/office/${firstOffice.office_id}`
      );
      const reviews = reviewsResponse.data.data.reviews;

      const ourReview = reviews.find(
        (r) => r.review_id === newReview.review_id
      );
      if (ourReview) {
        console.log("✅ Review found in office reviews:");
        console.log("   Review ID:", ourReview.review_id);
        console.log("   User ID:", ourReview.user_id);
        console.log("   User Name:", ourReview.user_name || "NULL/UNDEFINED");
        console.log("   Is anonymous:", ourReview.is_anonymous);
        console.log("   Status:", ourReview.status);
        console.log("   Comment:", ourReview.comment);

        if (!ourReview.user_name && !ourReview.is_anonymous) {
          console.log(
            "\n❌ ISSUE FOUND: Review is not anonymous but user_name is missing!"
          );
          console.log(
            "   This suggests the JOIN with users table is not working properly."
          );
          console.log("   Expected user name:", successfulLogin.user.full_name);
          console.log("   Expected user ID:", successfulLogin.user.user_id);
          console.log("   Actual user ID in review:", ourReview.user_id);
        } else if (ourReview.user_name) {
          console.log(
            "✅ User name is properly displayed:",
            ourReview.user_name
          );
        }
      } else {
        console.log("❌ Review not found in office reviews list");
      }
    } catch (error) {
      console.log(
        "❌ Review creation failed:",
        error.response?.data || error.message
      );
    }
  } catch (error) {
    console.error(
      "❌ Debug process failed:",
      error.response?.data || error.message
    );
  }
}

debugReviewCreation();

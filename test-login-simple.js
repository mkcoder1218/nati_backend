const axios = require("axios");

async function testLogin() {
  try {
    console.log("Testing login with known user...");

    // Try with citizen1@example.com (John Citizen)
    const loginResponse = await axios.post(
      "http://localhost:5002/api/auth/login",
      {
        email: "citizen1@example.com",
        password: "password",
      }
    );

    console.log("✅ Login successful!");
    console.log("User:", loginResponse.data.data.user.full_name);
    console.log(
      "Token:",
      loginResponse.data.data.token.substring(0, 20) + "..."
    );

    return loginResponse.data.data;
  } catch (error) {
    console.log(
      "❌ Login failed:",
      error.response?.data?.message || error.message
    );
    return null;
  }
}

testLogin();

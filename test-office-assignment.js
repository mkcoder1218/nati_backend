const { Pool } = require("pg");

const pool = new Pool({
  connectionString:
    "postgresql://natitest_owner:npg_WEcYKfn7V0kv@ep-shy-bush-a8gjm6xp-pooler.eastus2.azure.neon.tech/natitest?sslmode=require",
});

async function testOfficeAssignment() {
  try {
    console.log("=== Testing Office Assignment ===\n");

    // Check government officials
    console.log("1. Checking government officials...");
    const officials = await pool.query(
      "SELECT user_id, full_name, email, office_id FROM users WHERE role = 'official'"
    );
    console.log("Government officials:", officials.rows);
    console.log("");

    // Check specific office
    const officeId = "328e4f74-4896-4dfd-8d6b-00c86be70599";
    console.log(`2. Checking office ${officeId}...`);
    const office = await pool.query(
      "SELECT * FROM offices WHERE office_id = $1",
      [officeId]
    );
    console.log("Office data:", office.rows[0]);
    console.log("");

    // Check assigned officials for this office
    console.log("3. Checking assigned officials for this office...");
    const assigned = await pool.query(
      "SELECT user_id, full_name, email FROM users WHERE office_id = $1 AND role = 'official'",
      [officeId]
    );
    console.log("Assigned officials:", assigned.rows);
    console.log("");

    // If there are officials but none assigned, let's assign one for testing
    if (officials.rows.length > 0 && assigned.rows.length === 0) {
      const firstOfficial = officials.rows[0];
      console.log(
        `4. Assigning official ${firstOfficial.full_name} to office for testing...`
      );

      const assignResult = await pool.query(
        "UPDATE users SET office_id = $1 WHERE user_id = $2 AND role = 'official' RETURNING *",
        [officeId, firstOfficial.user_id]
      );
      console.log("Assignment result:", assignResult.rows[0]);
      console.log("");

      // Verify assignment
      console.log("5. Verifying assignment...");
      const verifyAssigned = await pool.query(
        "SELECT user_id, full_name, email FROM users WHERE office_id = $1 AND role = 'official'",
        [officeId]
      );
      console.log("Now assigned officials:", verifyAssigned.rows);
    }

    // Test the API endpoint directly
    console.log("6. Testing API endpoint...");
    try {
      const fetch = require("node-fetch");
      const response = await fetch(
        `http://localhost:5002/api/offices/${officeId}`
      );
      const apiData = await response.json();
      console.log("API Response:", JSON.stringify(apiData, null, 2));
    } catch (apiError) {
      console.log(
        "API test failed (server might not be running):",
        apiError.message
      );
    }

    // Test the API endpoint directly
    console.log("6. Testing API endpoint...");
    try {
      const axios = require("axios");
      const response = await axios.get(
        `http://localhost:5002/api/offices/${officeId}`
      );
      const apiData = response.data;
      console.log("API Response Status:", response.status);
      console.log("API Response:", JSON.stringify(apiData, null, 2));

      if (apiData.data && apiData.data.office) {
        const office = apiData.data.office;
        console.log("\n=== Office Assignment Info ===");
        console.log("Office Name:", office.name);
        console.log("Assigned Official ID:", office.assigned_official_id);
        console.log("Assigned Official Name:", office.assigned_official_name);

        if (office.assigned_official_id) {
          console.log("✅ Office has assigned official in API response");
        } else {
          console.log("❌ No assigned official found in API response");
        }
      }
    } catch (apiError) {
      console.log(
        "API test failed (server might not be running):",
        apiError.message
      );
    }

    await pool.end();
    console.log("\n=== Test Complete ===");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

testOfficeAssignment();

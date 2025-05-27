const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER || "postgres"}:${
      process.env.DB_PASSWORD || "postgres"
    }@${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || "5432"}/${
      process.env.DB_NAME || "government_feedback"
    }`,
});

async function assignOfficialsToOffices() {
  try {
    console.log("Starting to assign officials to offices...");

    // Get all offices
    const officesResult = await pool.query(`
      SELECT office_id, name, type
      FROM offices
      ORDER BY name
    `);

    console.log(`Found ${officesResult.rows.length} offices`);

    // Get all officials without office assignments
    const officialsResult = await pool.query(`
      SELECT user_id, email, full_name
      FROM users
      WHERE role = 'official' AND (office_id IS NULL OR office_id = '')
    `);

    console.log(`Found ${officialsResult.rows.length} unassigned officials`);

    if (officialsResult.rows.length === 0) {
      console.log("No unassigned officials found. Creating a test official...");

      // Create a test government official
      const bcrypt = require("bcryptjs");
      const hashedPassword = await bcrypt.hash("official123", 10);

      const newOfficialResult = await pool.query(
        `
        INSERT INTO users (email, password, role, full_name, phone_number)
        VALUES ($1, $2, 'official', $3, $4)
        RETURNING user_id, email, full_name
      `,
        [
          "official@addisababa.gov.et",
          hashedPassword,
          "Addis Ababa Government Official",
          "+251911234567",
        ]
      );

      console.log("Created test official:", newOfficialResult.rows[0]);
      officialsResult.rows.push(newOfficialResult.rows[0]);
    }

    // Assign each official to an office
    for (
      let i = 0;
      i < officialsResult.rows.length && i < officesResult.rows.length;
      i++
    ) {
      const official = officialsResult.rows[i];
      const office = officesResult.rows[i];

      await pool.query(
        `
        UPDATE users
        SET office_id = $1
        WHERE user_id = $2
      `,
        [office.office_id, official.user_id]
      );

      console.log(
        `✓ Assigned ${official.full_name} (${official.email}) to ${office.name}`
      );
    }

    // Verify assignments
    console.log("\nVerifying assignments...");
    const verifyResult = await pool.query(`
      SELECT u.email, u.full_name, o.name as office_name, o.office_id
      FROM users u
      LEFT JOIN offices o ON u.office_id = o.office_id
      WHERE u.role = 'official' AND u.office_id IS NOT NULL
    `);

    console.log("\nAssigned officials:");
    verifyResult.rows.forEach((user) => {
      console.log(
        `  ${user.full_name} (${user.email}) → ${user.office_name} (${user.office_id})`
      );
    });

    console.log("\n✅ Official assignment completed successfully!");
  } catch (error) {
    console.error("❌ Error assigning officials to offices:", error);
  } finally {
    await pool.end();
  }
}

// Run the script
assignOfficialsToOffices();

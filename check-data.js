const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'government_feedback'}`,
});

async function checkData() {
  try {
    console.log('🔍 Checking database data...\n');
    
    // Check government officials
    console.log('👥 Government Officials:');
    const officialsResult = await pool.query(`
      SELECT u.email, u.full_name, u.role, o.name as office_name, u.office_id
      FROM users u
      LEFT JOIN offices o ON u.office_id = o.office_id
      WHERE u.role = 'official'
    `);
    
    if (officialsResult.rows.length === 0) {
      console.log('   ❌ No government officials found');
    } else {
      officialsResult.rows.forEach(row => {
        console.log(`   ✅ ${row.full_name} (${row.email})`);
        console.log(`      Office: ${row.office_name || 'Not assigned'}`);
        console.log(`      Office ID: ${row.office_id || 'None'}\n`);
      });
    }
    
    // Check offices with review counts
    console.log('🏢 Offices and Review Counts:');
    const officesResult = await pool.query(`
      SELECT o.office_id, o.name, COUNT(r.review_id) as review_count
      FROM offices o
      LEFT JOIN reviews r ON o.office_id = r.office_id
      GROUP BY o.office_id, o.name
      ORDER BY review_count DESC
    `);
    
    officesResult.rows.forEach(row => {
      console.log(`   📊 ${row.name}: ${row.review_count} reviews (ID: ${row.office_id})`);
    });
    
    // Check sentiment data
    console.log('\n💭 Sentiment Analysis Data:');
    const sentimentResult = await pool.query(`
      SELECT o.name, sl.sentiment, COUNT(*) as count
      FROM offices o
      JOIN reviews r ON o.office_id = r.office_id
      JOIN sentiment_logs sl ON r.review_id = sl.review_id
      GROUP BY o.office_id, o.name, sl.sentiment
      ORDER BY o.name, sl.sentiment
    `);
    
    if (sentimentResult.rows.length === 0) {
      console.log('   ❌ No sentiment data found');
    } else {
      let currentOffice = '';
      sentimentResult.rows.forEach(row => {
        if (row.name !== currentOffice) {
          console.log(`\n   🏢 ${row.name}:`);
          currentOffice = row.name;
        }
        console.log(`      ${row.sentiment}: ${row.count}`);
      });
    }
    
    console.log('\n✅ Database check completed!');
    
  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    await pool.end();
  }
}

checkData();

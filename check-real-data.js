const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'password',
  database: 'government_feedback'
});

async function checkRealData() {
  try {
    console.log('=== CHECKING REAL DATA FOR REPORT GENERATION ===\n');
    
    // Check offices
    const offices = await pool.query('SELECT office_id, name, type FROM offices ORDER BY name');
    console.log('📍 Available offices:');
    offices.rows.forEach(office => {
      console.log(`  - ${office.name} (${office.type}) - ID: ${office.office_id}`);
    });
    
    // Check reviews
    const reviews = await pool.query(`
      SELECT COUNT(*) as count, AVG(rating) as avg_rating 
      FROM reviews 
      WHERE status = 'approved'
    `);
    console.log('\n📝 Reviews data:');
    console.log(`  - Total approved reviews: ${reviews.rows[0].count}`);
    console.log(`  - Average rating: ${parseFloat(reviews.rows[0].avg_rating || 0).toFixed(2)}`);
    
    // Check reviews by office
    const reviewsByOffice = await pool.query(`
      SELECT 
        o.name, 
        o.office_id,
        COUNT(r.*) as review_count, 
        AVG(r.rating) as avg_rating,
        COUNT(CASE WHEN r.rating >= 4 THEN 1 END) as positive_reviews,
        COUNT(CASE WHEN r.rating = 3 THEN 1 END) as neutral_reviews,
        COUNT(CASE WHEN r.rating <= 2 THEN 1 END) as negative_reviews
      FROM offices o 
      LEFT JOIN reviews r ON o.office_id = r.office_id AND r.status = 'approved'
      GROUP BY o.office_id, o.name 
      ORDER BY review_count DESC
    `);
    
    console.log('\n📊 Reviews by office:');
    reviewsByOffice.rows.forEach(row => {
      console.log(`  - ${row.name}:`);
      console.log(`    * ${row.review_count} reviews, avg rating: ${parseFloat(row.avg_rating || 0).toFixed(2)}`);
      console.log(`    * Positive: ${row.positive_reviews}, Neutral: ${row.neutral_reviews}, Negative: ${row.negative_reviews}`);
    });
    
    // Check sample comments
    const sampleReviews = await pool.query(`
      SELECT r.comment, r.rating, o.name as office_name, r.created_at
      FROM reviews r
      JOIN offices o ON r.office_id = o.office_id
      WHERE r.status = 'approved' AND r.comment IS NOT NULL AND r.comment != ''
      ORDER BY r.created_at DESC
      LIMIT 5
    `);
    
    console.log('\n💬 Sample recent reviews:');
    sampleReviews.rows.forEach((review, index) => {
      console.log(`  ${index + 1}. "${review.comment}" (${review.rating}⭐) - ${review.office_name}`);
    });
    
    // Check which office has the most data for a meaningful report
    const bestOfficeForReport = reviewsByOffice.rows.find(row => parseInt(row.review_count) > 0);
    
    if (bestOfficeForReport) {
      console.log('\n🎯 RECOMMENDED FOR REPORT GENERATION:');
      console.log(`Office: ${bestOfficeForReport.name}`);
      console.log(`Office ID: ${bestOfficeForReport.office_id}`);
      console.log(`Reviews: ${bestOfficeForReport.review_count}`);
      console.log(`Average Rating: ${parseFloat(bestOfficeForReport.avg_rating || 0).toFixed(2)}`);
    } else {
      console.log('\n⚠️  No office has reviews yet. You may need to add some test reviews first.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkRealData();

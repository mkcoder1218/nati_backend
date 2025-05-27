const axios = require('axios');

async function testOfficeReviews() {
  try {
    console.log('Testing office reviews endpoint...');
    
    // First get all offices to find a valid office ID
    const officesResponse = await axios.get('http://localhost:5002/api/offices');
    const offices = officesResponse.data.data.offices;
    
    if (offices.length === 0) {
      console.log('No offices found');
      return;
    }
    
    const firstOffice = offices[0];
    console.log('Testing with office:', firstOffice.name, '(ID:', firstOffice.office_id + ')');
    
    // Get reviews for this office
    const reviewsResponse = await axios.get(`http://localhost:5002/api/reviews/office/${firstOffice.office_id}`);
    const reviews = reviewsResponse.data.data.reviews;
    
    console.log('Found', reviews.length, 'reviews for this office:');
    reviews.forEach((review, index) => {
      console.log(`${index + 1}. ${review.user_name || 'Anonymous'}: ${review.rating}⭐`);
      console.log(`   Comment: ${review.comment}`);
      console.log(`   Status: ${review.status}`);
      console.log(`   Created: ${review.created_at}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testOfficeReviews();

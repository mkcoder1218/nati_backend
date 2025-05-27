const axios = require('axios');

async function testAuthenticatedAPI() {
  try {
    console.log('🔐 Testing authenticated API calls...\n');
    
    // Step 1: Login as government official
    console.log('1️⃣ Logging in as government official...');
    const loginResponse = await axios.post('http://localhost:5002/api/auth/login', {
      email: 'official@example.com',
      password: 'official123'
    });
    
    console.log('✅ Login successful!');
    console.log('   User:', loginResponse.data.data.user.full_name);
    console.log('   Role:', loginResponse.data.data.user.role);
    console.log('   Office:', loginResponse.data.data.user.office_name);
    console.log('   Office ID:', loginResponse.data.data.user.office_id);
    
    const token = loginResponse.data.data.token;
    console.log('   Token:', token.substring(0, 20) + '...');
    
    // Step 2: Test dashboard stats API with authentication
    console.log('\n2️⃣ Testing dashboard stats API...');
    const officeId = loginResponse.data.data.user.office_id;
    
    const dashboardResponse = await axios.get(
      `http://localhost:5002/api/government/dashboard/stats?office_id=${officeId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('✅ Dashboard API successful!');
    console.log('   Status:', dashboardResponse.status);
    console.log('   Response:', JSON.stringify(dashboardResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Headers:', error.response.headers);
    }
  }
}

testAuthenticatedAPI();

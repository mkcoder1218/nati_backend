const axios = require('axios');

async function testRealReport() {
  try {
    console.log('🔐 Testing real report generation...');
    
    // Login as government official
    const loginResponse = await axios.post('http://localhost:5002/api/auth/login', {
      email: 'official@example.com',
      password: 'password'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful!');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('\n📊 Generating sentiment analysis report with real data...');
    
    // Generate report for the official's assigned office
    const reportUrl = 'http://localhost:5002/api/government/reports/generate';
    const params = {
      report_type: 'sentiment',
      report_format: 'pdf'
    };
    
    console.log('Making request to:', reportUrl);
    console.log('With params:', params);
    console.log('With headers:', { Authorization: 'Bearer [TOKEN]' });
    
    const reportResponse = await axios.get(reportUrl, {
      headers,
      params,
      timeout: 30000 // 30 second timeout
    });
    
    console.log('✅ Report generated successfully!');
    console.log('📄 Report details:', reportResponse.data);
    
    // Test fetching reports list
    console.log('\n📋 Fetching reports list...');
    
    const reportsResponse = await axios.get('http://localhost:5002/api/reports', {
      headers
    });
    
    console.log('✅ Reports list fetched!');
    console.log(`📊 Found ${reportsResponse.data.data.length} reports`);
    
    reportsResponse.data.data.forEach((report, index) => {
      console.log(`\n📄 Report ${index + 1}:`);
      console.log(`   - Title: ${report.title}`);
      console.log(`   - Type: ${report.report_type}`);
      console.log(`   - Status: ${report.status}`);
      console.log(`   - File: ${report.filename}`);
      console.log(`   - Size: ${report.file_size_formatted || 'Unknown'}`);
    });
    
    console.log('\n🎉 Real report generation test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Make sure the backend server is running on port 5002');
    }
  }
}

testRealReport();

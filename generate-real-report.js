const axios = require('axios');

async function generateRealReport() {
  try {
    console.log('🔐 Logging in as government official...');
    
    // First, login to get the JWT token
    const loginResponse = await axios.post('http://localhost:5002/api/auth/login', {
      email: 'official@example.com',
      password: 'password'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful!');
    
    // Set up headers with the token
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('\n📊 Generating real sentiment analysis report...');
    
    // Generate a sentiment analysis report for the official's office
    const reportResponse = await axios.get('http://localhost:5002/api/government/reports/generate', {
      headers,
      params: {
        report_type: 'sentiment',
        report_format: 'pdf',
        office_id: '328e4f74-4896-4dfd-8d6b-00c86be70599', // Addis Ababa City Administration
        start_date: '2025-01-01',
        end_date: '2025-12-31'
      }
    });
    
    console.log('✅ Report generation completed!');
    console.log('📄 Report details:');
    console.log(`   - File: ${reportResponse.data.filename}`);
    console.log(`   - URL: ${reportResponse.data.url}`);
    console.log(`   - Size: ${reportResponse.data.fileSize} bytes`);
    
    console.log('\n📋 Fetching reports list...');
    
    // Now fetch the reports list to see our newly created report
    const reportsResponse = await axios.get('http://localhost:5002/api/reports', {
      headers
    });
    
    console.log('✅ Reports fetched successfully!');
    console.log(`📊 Total reports: ${reportsResponse.data.data.length}`);
    
    reportsResponse.data.data.forEach((report, index) => {
      console.log(`\n📄 Report ${index + 1}:`);
      console.log(`   - Title: ${report.title}`);
      console.log(`   - Type: ${report.report_type}`);
      console.log(`   - Status: ${report.status}`);
      console.log(`   - Created: ${new Date(report.created_at).toLocaleString()}`);
      console.log(`   - Size: ${report.file_size_formatted || 'Unknown'}`);
      console.log(`   - Office: ${report.office_name || 'All Offices'}`);
      console.log(`   - File: ${report.filename}`);
    });
    
    console.log('\n🎉 Real report generation and listing completed successfully!');
    console.log('\n💡 You can now:');
    console.log('   1. View the reports in the frontend at /government/reports');
    console.log('   2. Download the generated PDF files');
    console.log('   3. See real data instead of mock data');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
  }
}

generateRealReport();

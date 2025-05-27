const http = require('http');

// Configuration
const host = 'localhost';
const port = process.env.PORT || 5000;
const path = '/';

// Create options for the HTTP request
const options = {
  host,
  port,
  path,
  method: 'GET',
  timeout: 2000, // 2 seconds timeout
};

console.log(`Checking server at http://${host}:${port}${path}...`);

// Make the request
const req = http.request(options, (res) => {
  console.log(`Server responded with status code: ${res.statusCode}`);
  
  let data = '';
  
  // Collect response data
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  // Process the complete response
  res.on('end', () => {
    try {
      const parsedData = JSON.parse(data);
      console.log('Response data:', parsedData);
      console.log('Server is running and responding correctly.');
    } catch (e) {
      console.log('Response data (not JSON):', data);
      console.log('Server is running but response is not valid JSON.');
    }
  });
});

// Handle errors
req.on('error', (e) => {
  console.error('Error connecting to server:', e.message);
  console.log('Make sure the server is running with: npm run dev');
});

// Handle timeout
req.on('timeout', () => {
  console.error('Request timed out');
  req.abort();
});

// End the request
req.end();

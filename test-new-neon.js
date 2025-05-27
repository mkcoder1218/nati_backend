const { Pool } = require('pg');
require('dotenv').config();

console.log('🔗 Testing New Neon Database Connection...');
console.log('==========================================');

const connectionString = process.env.DATABASE_URL;
console.log('📍 Connection String:', connectionString ? connectionString.replace(/:([^:@]+)@/, ':****@') : 'Not found');

async function testConnection() {
  // Try different connection configurations
  const configs = [
    {
      name: 'Standard SSL',
      config: {
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 30000,
      }
    },
    {
      name: 'Require SSL',
      config: {
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false, require: true },
        connectionTimeoutMillis: 30000,
      }
    },
    {
      name: 'No SSL Rejection',
      config: {
        connectionString: connectionString,
        ssl: false,
        connectionTimeoutMillis: 30000,
      }
    }
  ];

  for (const { name, config } of configs) {
    console.log(`\n🔄 Trying ${name}...`);
    
    const pool = new Pool(config);
    
    try {
      const client = await pool.connect();
      
      console.log('✅ Connection successful!');
      
      const result = await client.query('SELECT version(), current_database(), current_user');
      console.log(`📊 Database: ${result.rows[0].current_database}`);
      console.log(`📊 User: ${result.rows[0].current_user}`);
      console.log(`📊 Version: ${result.rows[0].version.split(' ')[1]}`);
      
      client.release();
      await pool.end();
      
      console.log('\n🎉 Connection test successful!');
      return true;
      
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      await pool.end();
    }
  }
  
  console.log('\n💥 All connection attempts failed.');
  return false;
}

testConnection().then(success => {
  if (success) {
    console.log('\n✅ Ready to proceed with migration!');
    process.exit(0);
  } else {
    console.log('\n❌ Connection issues need to be resolved.');
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check if the Neon database is active in your dashboard');
    console.log('2. Verify the connection string is correct');
    console.log('3. Check if your IP is allowed (if IP restrictions are enabled)');
    console.log('4. Try connecting from Neon dashboard first');
    process.exit(1);
  }
});

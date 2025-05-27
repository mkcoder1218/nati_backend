#!/usr/bin/env node

/**
 * Quick Fix Database Script
 * 
 * This script helps you quickly switch between Neon and local database
 * when experiencing connection issues.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testNeonConnection() {
  if (!process.env.DATABASE_URL) {
    return false;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    await pool.end();
    return true;
  } catch (error) {
    await pool.end();
    return false;
  }
}

async function testLocalConnection() {
  const pool = new Pool({
    host: process.env.DB_HOST_LOCAL || 'localhost',
    port: parseInt(process.env.DB_PORT_LOCAL || '5432'),
    database: process.env.DB_NAME_LOCAL || 'government_feedback',
    user: process.env.DB_USER_LOCAL || 'postgres',
    password: process.env.DB_PASSWORD_LOCAL || 'postgres',
    connectionTimeoutMillis: 5000,
  });

  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    await pool.end();
    return true;
  } catch (error) {
    await pool.end();
    return false;
  }
}

function switchToLocal() {
  const envPath = path.join(__dirname, '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Comment out DATABASE_URL
  envContent = envContent.replace(
    /^DATABASE_URL=/m,
    '# DATABASE_URL='
  );
  
  // Uncomment local database settings
  envContent = envContent.replace(
    /^# DB_HOST=/m,
    'DB_HOST='
  );
  envContent = envContent.replace(
    /^# DB_PORT=/m,
    'DB_PORT='
  );
  envContent = envContent.replace(
    /^# DB_NAME=/m,
    'DB_NAME='
  );
  envContent = envContent.replace(
    /^# DB_USER=/m,
    'DB_USER='
  );
  envContent = envContent.replace(
    /^# DB_PASSWORD=/m,
    'DB_PASSWORD='
  );
  
  // Set local database values
  if (!envContent.includes('DB_HOST=')) {
    envContent += '\n# Local Database Configuration\n';
    envContent += 'DB_HOST=localhost\n';
    envContent += 'DB_PORT=5432\n';
    envContent += 'DB_NAME=government_feedback\n';
    envContent += 'DB_USER=postgres\n';
    envContent += 'DB_PASSWORD=postgres\n';
  }
  
  fs.writeFileSync(envPath, envContent);
}

function switchToNeon() {
  const envPath = path.join(__dirname, '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Uncomment DATABASE_URL
  envContent = envContent.replace(
    /^# DATABASE_URL=/m,
    'DATABASE_URL='
  );
  
  fs.writeFileSync(envPath, envContent);
}

async function main() {
  log('\n🔧 Database Connection Quick Fix', 'bright');
  log('================================', 'bright');
  
  log('\n1. Testing Neon connection...', 'cyan');
  const neonWorks = await testNeonConnection();
  
  if (neonWorks) {
    log('✅ Neon connection is working!', 'green');
    log('Your application should work fine with Neon.', 'green');
    return;
  } else {
    log('❌ Neon connection failed', 'red');
  }
  
  log('\n2. Testing local PostgreSQL connection...', 'cyan');
  const localWorks = await testLocalConnection();
  
  if (localWorks) {
    log('✅ Local PostgreSQL is available!', 'green');
    log('Switching to local database...', 'yellow');
    switchToLocal();
    log('✅ Switched to local database configuration', 'green');
    log('\nPlease restart your backend server:', 'cyan');
    log('npm run dev', 'blue');
  } else {
    log('❌ Local PostgreSQL is not available', 'red');
    log('\nOptions to fix this:', 'cyan');
    log('1. Install and start PostgreSQL locally', 'blue');
    log('2. Fix your Neon database connection', 'blue');
    log('3. Use a different cloud database provider', 'blue');
    
    log('\nFor Neon troubleshooting:', 'cyan');
    log('1. Check if your Neon project is active (not sleeping)', 'blue');
    log('2. Verify your DATABASE_URL is correct', 'blue');
    log('3. Check if your IP is whitelisted', 'blue');
    log('4. Try accessing Neon dashboard to wake up the database', 'blue');
  }
}

main().catch(console.error);

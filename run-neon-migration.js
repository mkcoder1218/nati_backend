#!/usr/bin/env node

const { main } = require('./migrate-to-neon');

console.log('🔄 Negari Database Migration to Neon');
console.log('====================================');
console.log('');
console.log('This script will:');
console.log('1. Export your current local PostgreSQL database');
console.log('2. Clear the Neon database (if it has existing data)');
console.log('3. Import all your local data to Neon');
console.log('4. Validate the migration');
console.log('5. Update your .env to use Neon as primary database');
console.log('');

// Ask for confirmation
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('⚠️  This will replace ALL data in your Neon database. Continue? (y/N): ', (answer) => {
  rl.close();
  
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    console.log('');
    console.log('🚀 Starting migration...');
    console.log('');
    
    main().then(() => {
      console.log('');
      console.log('✅ Migration completed successfully!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Restart your backend server');
      console.log('2. Test your application to ensure everything works');
      console.log('3. Your local database is preserved as backup');
      process.exit(0);
    }).catch((error) => {
      console.error('');
      console.error('❌ Migration failed:', error.message);
      console.error('');
      console.error('Your local database is unchanged.');
      console.error('Please check the error and try again.');
      process.exit(1);
    });
  } else {
    console.log('');
    console.log('❌ Migration cancelled by user.');
    console.log('Your databases remain unchanged.');
    process.exit(0);
  }
});

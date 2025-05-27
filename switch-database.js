require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('🔄 Database Switching Utility');
console.log('=============================');

// Read current .env file
function readEnvFile() {
  const envPath = path.join(__dirname, '.env');
  return fs.readFileSync(envPath, 'utf8');
}

// Write updated .env file
function writeEnvFile(content) {
  const envPath = path.join(__dirname, '.env');
  fs.writeFileSync(envPath, content, 'utf8');
}

// Update DB_PRIMARY setting
function updateDatabasePrimary(newPrimary) {
  const envContent = readEnvFile();
  const updatedContent = envContent.replace(
    /^DB_PRIMARY=.*$/m,
    `DB_PRIMARY=${newPrimary}`
  );
  writeEnvFile(updatedContent);
}

// Get current database setting
function getCurrentDatabaseSetting() {
  return process.env.DB_PRIMARY || 'auto';
}

// Display current configuration
function displayCurrentConfig() {
  const current = getCurrentDatabaseSetting();
  
  console.log('\n📋 Current Database Configuration');
  console.log('─'.repeat(40));
  console.log(`🎯 Primary Database: ${current}`);
  
  switch (current.toLowerCase()) {
    case 'neon':
      console.log('🌐 Mode: Neon Cloud Database Only');
      console.log('📝 Description: Always uses Neon, fails if Neon unavailable');
      break;
    case 'local':
      console.log('🏠 Mode: Local PostgreSQL Database Only');
      console.log('📝 Description: Always uses Local, fails if Local unavailable');
      break;
    case 'auto':
    default:
      console.log('🔄 Mode: Automatic Fallback');
      console.log('📝 Description: Tries Neon first, falls back to Local if needed');
      break;
  }
  
  console.log('\n🔗 Connection Strings:');
  console.log(`🌐 Neon: ${process.env.DATABASE_URL_NEON ? '✅ Configured' : '❌ Missing'}`);
  console.log(`🏠 Local: ${process.env.DATABASE_URL_LOCAL ? '✅ Configured' : '❌ Missing'}`);
}

// Switch database mode
function switchDatabase(mode) {
  const validModes = ['neon', 'local', 'auto'];
  
  if (!validModes.includes(mode.toLowerCase())) {
    throw new Error(`Invalid mode: ${mode}. Valid modes: ${validModes.join(', ')}`);
  }
  
  const currentMode = getCurrentDatabaseSetting();
  
  if (currentMode.toLowerCase() === mode.toLowerCase()) {
    console.log(`✅ Database is already set to '${mode}' mode`);
    return false;
  }
  
  console.log(`🔄 Switching from '${currentMode}' to '${mode}' mode...`);
  
  updateDatabasePrimary(mode.toLowerCase());
  
  console.log(`✅ Database mode switched to '${mode}'`);
  console.log(`🔄 Please restart your application for changes to take effect`);
  
  return true;
}

// Interactive mode
function runInteractive() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  displayCurrentConfig();
  
  console.log('\n🔧 Available Options:');
  console.log('1. Switch to Neon only (neon)');
  console.log('2. Switch to Local only (local)');
  console.log('3. Switch to Auto fallback (auto)');
  console.log('4. Test current configuration');
  console.log('5. Exit');
  
  rl.question('\nSelect an option (1-5): ', (answer) => {
    rl.close();
    
    switch (answer.trim()) {
      case '1':
        switchDatabase('neon');
        break;
      case '2':
        switchDatabase('local');
        break;
      case '3':
        switchDatabase('auto');
        break;
      case '4':
        console.log('\n🔍 Testing current configuration...');
        const { runTests } = require('./test-dual-database');
        runTests();
        return;
      case '5':
        console.log('👋 Goodbye!');
        break;
      default:
        console.log('❌ Invalid option selected');
        break;
    }
    
    process.exit(0);
  });
}

// Command line mode
function runCommandLine() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    displayCurrentConfig();
    console.log('\n💡 Usage:');
    console.log('  node switch-database.js [mode]');
    console.log('  node switch-database.js interactive');
    console.log('  node switch-database.js test');
    console.log('\n🔧 Available modes: neon, local, auto');
    return;
  }
  
  const command = args[0].toLowerCase();
  
  switch (command) {
    case 'interactive':
    case 'i':
      runInteractive();
      break;
      
    case 'test':
    case 't':
      console.log('🔍 Testing current configuration...');
      const { runTests } = require('./test-dual-database');
      runTests();
      break;
      
    case 'status':
    case 's':
      displayCurrentConfig();
      break;
      
    case 'neon':
    case 'local':
    case 'auto':
      switchDatabase(command);
      break;
      
    default:
      console.log(`❌ Unknown command: ${command}`);
      console.log('🔧 Available commands: neon, local, auto, interactive, test, status');
      process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  try {
    runCommandLine();
  } catch (error) {
    console.error('💥 Error:', error.message);
    process.exit(1);
  }
}

module.exports = {
  getCurrentDatabaseSetting,
  switchDatabase,
  displayCurrentConfig,
  updateDatabasePrimary
};

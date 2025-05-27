const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Color logging
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Local database configuration
const localConfig = {
  host: process.env.DB_HOST_LOCAL || 'localhost',
  port: parseInt(process.env.DB_PORT_LOCAL || '5432'),
  database: process.env.DB_NAME_LOCAL || 'government_feedback',
  user: process.env.DB_USER_LOCAL || 'postgres',
  password: process.env.DB_PASSWORD_LOCAL || 'postgres',
};

async function createBackup() {
  try {
    log('🔄 Creating backup of local database...', 'blue');
    
    // Create backups directory if it doesn't exist
    const backupsDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir);
      log('📁 Created backups directory', 'cyan');
    }
    
    // Generate timestamp for backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const timeOnly = new Date().toISOString().split('T')[1].replace(/[:.]/g, '-').split('.')[0];
    const backupFile = path.join(backupsDir, `negari_backup_${timestamp}_${timeOnly}.sql`);
    
    log('📤 Creating database backup using Node.js...', 'yellow');
    log(`📍 Database: ${localConfig.database}@${localConfig.host}:${localConfig.port}`, 'cyan');
    
    // Create database connection
    const pool = new Pool(localConfig);
    const client = await pool.connect();
    
    try {
      // Start building the SQL backup
      let sqlBackup = '';
      
      // Add header
      sqlBackup += `-- Negari Database Backup\n`;
      sqlBackup += `-- Created: ${new Date().toISOString()}\n`;
      sqlBackup += `-- Database: ${localConfig.database}\n`;
      sqlBackup += `-- Host: ${localConfig.host}:${localConfig.port}\n\n`;
      
      // Enable UUID extension
      sqlBackup += `-- Enable UUID extension\n`;
      sqlBackup += `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n\n`;
      
      // Get all custom types (enums)
      const typesResult = await client.query(`
        SELECT typname, enumlabel
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        ORDER BY typname, e.enumsortorder
      `);
      
      if (typesResult.rows.length > 0) {
        log('📋 Backing up custom types...', 'cyan');
        const typeGroups = {};
        
        typesResult.rows.forEach(row => {
          if (!typeGroups[row.typname]) {
            typeGroups[row.typname] = [];
          }
          typeGroups[row.typname].push(row.enumlabel);
        });
        
        Object.keys(typeGroups).forEach(typeName => {
          const labels = typeGroups[typeName].map(label => `'${label}'`).join(', ');
          sqlBackup += `-- Create enum type: ${typeName}\n`;
          sqlBackup += `DO $$ BEGIN\n`;
          sqlBackup += `    CREATE TYPE ${typeName} AS ENUM (${labels});\n`;
          sqlBackup += `EXCEPTION\n`;
          sqlBackup += `    WHEN duplicate_object THEN null;\n`;
          sqlBackup += `END $$;\n\n`;
        });
      }
      
      // Get all tables in dependency order
      const tablesResult = await client.query(`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        ORDER BY tablename
      `);
      
      log(`📋 Found ${tablesResult.rows.length} tables to backup`, 'cyan');
      
      // Get table schemas and data
      for (const tableRow of tablesResult.rows) {
        const tableName = tableRow.tablename;
        log(`   📄 Backing up table: ${tableName}`, 'yellow');
        
        // Get table data
        const dataResult = await client.query(`SELECT * FROM "${tableName}"`);
        
        if (dataResult.rows.length > 0) {
          // Get column names
          const columns = Object.keys(dataResult.rows[0]);
          
          sqlBackup += `-- Data for table ${tableName} (${dataResult.rows.length} rows)\n`;
          
          for (const row of dataResult.rows) {
            const values = columns.map(col => {
              const value = row[col];
              if (value === null) return 'NULL';
              if (typeof value === 'string') {
                return `'${value.replace(/'/g, "''")}'`;
              }
              if (value instanceof Date) {
                return `'${value.toISOString()}'`;
              }
              if (typeof value === 'boolean') {
                return value ? 'true' : 'false';
              }
              if (Array.isArray(value)) {
                return `'${JSON.stringify(value)}'`;
              }
              return value;
            });
            
            sqlBackup += `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;\n`;
          }
          
          sqlBackup += `\n`;
        } else {
          sqlBackup += `-- Table ${tableName} is empty\n\n`;
        }
      }
      
      // Write backup file
      fs.writeFileSync(backupFile, sqlBackup);
      
      const stats = fs.statSync(backupFile);
      log(`✅ Backup created successfully!`, 'green');
      log(`📁 File: ${backupFile}`, 'cyan');
      log(`📊 Size: ${(stats.size / 1024).toFixed(2)} KB`, 'cyan');
      
      // Create a restore script
      const restoreScript = `#!/usr/bin/env node
// Restore script for Negari database backup
// Created: ${new Date().toISOString()}

const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

async function restore() {
  const pool = new Pool({
    host: process.env.DB_HOST_LOCAL || 'localhost',
    port: parseInt(process.env.DB_PORT_LOCAL || '5432'),
    database: process.env.DB_NAME_LOCAL || 'government_feedback',
    user: process.env.DB_USER_LOCAL || 'postgres',
    password: process.env.DB_PASSWORD_LOCAL || 'postgres',
  });

  try {
    console.log('🔄 Restoring Negari database from backup...');
    console.log('📁 Backup file: ${path.basename(backupFile)}');
    
    const client = await pool.connect();
    const sqlContent = fs.readFileSync('${backupFile}', 'utf8');
    
    // Split into statements and execute
    const statements = sqlContent.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      try {
        await client.query(statements[i] + ';');
        if ((i + 1) % 50 === 0) {
          console.log(\`   ⏳ Processed \${i + 1}/\${statements.length} statements...\`);
        }
      } catch (error) {
        if (!error.message.includes('already exists') && 
            !error.message.includes('duplicate key')) {
          console.warn(\`   ⚠️  Statement \${i + 1} warning: \${error.message}\`);
        }
      }
    }
    
    console.log('✅ Database restored successfully!');
    console.log('🔄 Please restart your application.');
    
    client.release();
  } catch (error) {
    console.error('❌ Restore failed:', error.message);
  } finally {
    await pool.end();
  }
}

restore();
`;
      
      const restoreScriptFile = path.join(backupsDir, `restore_${timestamp}_${timeOnly}.js`);
      fs.writeFileSync(restoreScriptFile, restoreScript);
      log(`📝 Restore script created: ${restoreScriptFile}`, 'cyan');
      
      return backupFile;
      
    } finally {
      client.release();
      await pool.end();
    }
    
  } catch (error) {
    log(`❌ Backup failed: ${error.message}`, 'red');
    throw error;
  }
}

async function listBackups() {
  const backupsDir = path.join(__dirname, 'backups');
  
  if (!fs.existsSync(backupsDir)) {
    log('📁 No backups directory found', 'yellow');
    return;
  }
  
  const files = fs.readdirSync(backupsDir)
    .filter(file => file.endsWith('.sql'))
    .sort()
    .reverse(); // Most recent first
  
  if (files.length === 0) {
    log('📁 No backup files found', 'yellow');
    return;
  }
  
  log('📋 Available backups:', 'blue');
  files.forEach((file, index) => {
    const filePath = path.join(backupsDir, file);
    const stats = fs.statSync(filePath);
    const size = (stats.size / 1024).toFixed(2);
    const date = stats.mtime.toISOString().split('T')[0];
    const time = stats.mtime.toISOString().split('T')[1].split('.')[0];
    
    log(`   ${index + 1}. ${file}`, 'cyan');
    log(`      📅 Created: ${date} ${time}`, 'cyan');
    log(`      📊 Size: ${size} KB`, 'cyan');
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--list') || args.includes('-l')) {
    await listBackups();
    return;
  }
  
  log('🗄️  Negari Database Backup Tool (Node.js)', 'blue');
  log('==========================================', 'blue');
  
  try {
    const backupFile = await createBackup();
    
    log('', 'reset');
    log('✅ Backup completed successfully!', 'green');
    log('', 'reset');
    log('📝 To restore this backup later:', 'yellow');
    log(`   node backups/restore_*.js`, 'cyan');
    log('', 'reset');
    log('📋 To list all backups:', 'yellow');
    log(`   node backup-local-db-nodejs.js --list`, 'cyan');
    
  } catch (error) {
    log('', 'reset');
    log(`❌ Backup failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { createBackup, listBackups };

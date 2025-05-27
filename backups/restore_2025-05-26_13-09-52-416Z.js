#!/usr/bin/env node
// Restore script for Negari database backup
// Created: 2025-05-26T13:09:52.707Z

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
    console.log('📁 Backup file: negari_backup_2025-05-26_13-09-52-416Z.sql');
    
    const client = await pool.connect();
    const sqlContent = fs.readFileSync('C:\Users\mkr\Downloads\Telegram Desktop\Negari\Backend\backups\negari_backup_2025-05-26_13-09-52-416Z.sql', 'utf8');
    
    // Split into statements and execute
    const statements = sqlContent.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      try {
        await client.query(statements[i] + ';');
        if ((i + 1) % 50 === 0) {
          console.log(`   ⏳ Processed ${i + 1}/${statements.length} statements...`);
        }
      } catch (error) {
        if (!error.message.includes('already exists') && 
            !error.message.includes('duplicate key')) {
          console.warn(`   ⚠️  Statement ${i + 1} warning: ${error.message}`);
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

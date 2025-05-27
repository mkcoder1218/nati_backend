const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Color logging
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Local database configuration
const localConfig = {
  host: process.env.DB_HOST_LOCAL || "localhost",
  port: parseInt(process.env.DB_PORT_LOCAL || "5432"),
  database: process.env.DB_NAME_LOCAL || "government_feedback",
  user: process.env.DB_USER_LOCAL || "postgres",
  password: process.env.DB_PASSWORD_LOCAL || "postgres",
};

async function createBackup() {
  try {
    log("🔄 Creating backup of local database...", "blue");

    // Create backups directory if it doesn't exist
    const backupsDir = path.join(__dirname, "backups");
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir);
      log("📁 Created backups directory", "cyan");
    }

    // Generate timestamp for backup filename
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .split("T")[0];
    const timeOnly = new Date()
      .toISOString()
      .split("T")[1]
      .replace(/[:.]/g, "-")
      .split(".")[0];
    const backupFile = path.join(
      backupsDir,
      `negari_backup_${timestamp}_${timeOnly}.sql`
    );

    // Create backup using pg_dump
    const dumpCommand = `pg_dump -h ${localConfig.host} -p ${localConfig.port} -U ${localConfig.user} -d ${localConfig.database} --clean --if-exists --create --inserts -f "${backupFile}"`;

    log("📤 Running pg_dump...", "yellow");
    log(
      `📍 Database: ${localConfig.database}@${localConfig.host}:${localConfig.port}`,
      "cyan"
    );

    const { stdout, stderr } = await execAsync(dumpCommand, {
      env: { ...process.env, PGPASSWORD: localConfig.password },
    });

    if (stderr && !stderr.includes("NOTICE")) {
      log(`⚠️  Backup warnings: ${stderr}`, "yellow");
    }

    // Verify backup file
    if (fs.existsSync(backupFile)) {
      const stats = fs.statSync(backupFile);
      if (stats.size > 0) {
        log(`✅ Backup created successfully!`, "green");
        log(`📁 File: ${backupFile}`, "cyan");
        log(`📊 Size: ${(stats.size / 1024).toFixed(2)} KB`, "cyan");

        // Create a restore script
        const restoreScript = `#!/usr/bin/env node
// Restore script for Negari database backup
// Created: ${new Date().toISOString()}

const { exec } = require('child_process');
require('dotenv').config();

const restoreCommand = \`psql -h \${process.env.DB_HOST_LOCAL || 'localhost'} -p \${process.env.DB_PORT_LOCAL || '5432'} -U \${process.env.DB_USER_LOCAL || 'postgres'} -d postgres -f "${backupFile}"\`;

console.log('🔄 Restoring Negari database from backup...');
console.log('📁 Backup file: ${backupFile}');

exec(restoreCommand, {
  env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD_LOCAL || 'postgres' }
}, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Restore failed:', error.message);
    return;
  }

  if (stderr && !stderr.includes('NOTICE')) {
    console.warn('⚠️  Restore warnings:', stderr);
  }

  console.log('✅ Database restored successfully!');
  console.log('🔄 Please restart your application.');
});
`;

        const restoreScriptFile = path.join(
          backupsDir,
          `restore_${timestamp}_${timeOnly}.js`
        );
        fs.writeFileSync(restoreScriptFile, restoreScript);
        log(`📝 Restore script created: ${restoreScriptFile}`, "cyan");

        return backupFile;
      } else {
        throw new Error("Backup file is empty");
      }
    } else {
      throw new Error("Backup file was not created");
    }
  } catch (error) {
    log(`❌ Backup failed: ${error.message}`, "red");
    throw error;
  }
}

async function listBackups() {
  const backupsDir = path.join(__dirname, "backups");

  if (!fs.existsSync(backupsDir)) {
    log("📁 No backups directory found", "yellow");
    return;
  }

  const files = fs
    .readdirSync(backupsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .reverse(); // Most recent first

  if (files.length === 0) {
    log("📁 No backup files found", "yellow");
    return;
  }

  log("📋 Available backups:", "blue");
  files.forEach((file, index) => {
    const filePath = path.join(backupsDir, file);
    const stats = fs.statSync(filePath);
    const size = (stats.size / 1024).toFixed(2);
    const date = stats.mtime.toISOString().split("T")[0];
    const time = stats.mtime.toISOString().split("T")[1].split(".")[0];

    log(`   ${index + 1}. ${file}`, "cyan");
    log(`      📅 Created: ${date} ${time}`, "cyan");
    log(`      📊 Size: ${size} KB`, "cyan");
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--list") || args.includes("-l")) {
    await listBackups();
    return;
  }

  log("🗄️  Negari Database Backup Tool", "blue");
  log("================================", "blue");

  try {
    const backupFile = await createBackup();

    log("", "reset");
    log("✅ Backup completed successfully!", "green");
    log("", "reset");
    log("📝 To restore this backup later:", "yellow");
    log(`   node backups/restore_*.js`, "cyan");
    log("", "reset");
    log("📋 To list all backups:", "yellow");
    log(`   node backup-local-db.js --list`, "cyan");
  } catch (error) {
    log("", "reset");
    log(`❌ Backup failed: ${error.message}`, "red");
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { createBackup, listBackups };

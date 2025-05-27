# Negari Database Migration to Neon

This guide will help you migrate your local PostgreSQL database to Neon cloud database while preserving all your existing data.

## 🎯 Overview

The migration process will:
1. **Backup** your local database (safety first!)
2. **Export** all data from your local PostgreSQL
3. **Clear** the Neon database (if it has existing data)
4. **Import** all your local data to Neon
5. **Validate** the migration was successful
6. **Update** your .env configuration to use Neon

## 📋 Prerequisites

Before starting the migration, ensure you have:

- [x] **PostgreSQL** installed locally with `pg_dump` and `psql` commands available
- [x] **Node.js** and npm installed
- [x] **Neon database** created and connection string ready
- [x] **Local database** running with your current data
- [x] **Backup space** available (recommended: at least 2x your database size)

## 🔧 Pre-Migration Setup

### 1. Verify Your Neon Connection

Your `.env` file should have the Neon DATABASE_URL:
```env
DATABASE_URL=postgresql://neondb_owner:npg_tmdEzTXeh25K@ep-snowy-hill-a5wjjggn-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### 2. Install Dependencies

Make sure you have the required Node.js packages:
```bash
npm install pg dotenv
```

### 3. Test Database Connections

Test your local database:
```bash
psql -h localhost -p 5432 -U postgres -d government_feedback -c "SELECT COUNT(*) FROM users;"
```

Test your Neon database:
```bash
psql "postgresql://neondb_owner:npg_tmdEzTXeh25K@ep-snowy-hill-a5wjjggn-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require" -c "SELECT version();"
```

## 🚀 Migration Process

### Step 1: Create a Backup (Recommended)

Before starting the migration, create a backup of your local database:

```bash
node backup-local-db.js
```

This will:
- Create a complete backup in the `backups/` directory
- Generate a restore script for easy recovery
- Show backup file size and location

### Step 2: Run the Migration

Execute the migration script:

```bash
node run-neon-migration.js
```

The script will:
1. **Ask for confirmation** before proceeding
2. **Test Neon connection** to ensure it's accessible
3. **Export local database** using pg_dump
4. **Clear Neon database** to avoid conflicts
5. **Import data to Neon** with progress tracking
6. **Validate migration** by comparing table counts

### Step 3: Verify Migration

After migration completes, verify your data:

1. **Check table counts** (displayed during migration)
2. **Test application functionality**
3. **Verify user accounts** can log in
4. **Check office data** and reviews
5. **Test admin panel** functionality

## 📊 Migration Output

During migration, you'll see output like:

```
🚀 Starting migration from Local PostgreSQL to Neon...
============================================================
🔗 Testing Neon database connection...
✅ Neon connection successful
📋 PostgreSQL version: 15.4
🔄 Starting local database export...
📤 Exporting database with pg_dump...
✅ Export completed successfully: exports/local_export_2024-01-15T10-30-00.sql
📊 Export file size: 245.67 KB
🧹 Clearing existing data in Neon database...
📋 Found 9 existing tables
   ✓ Dropped table: users
   ✓ Dropped table: offices
   ... (more tables)
✅ Neon database cleared successfully
📥 Importing data to Neon database...
📝 Executing 156 SQL statements...
   ⏳ Processed 50/156 statements...
   ⏳ Processed 100/156 statements...
   ⏳ Processed 150/156 statements...
✅ Import completed: 154 successful, 2 errors/warnings
🔍 Validating migration...
📊 Local database tables: 9
📊 Neon database tables: 9
   ✅ users: 12 rows (matches local)
   ✅ offices: 8 rows (matches local)
   ✅ reviews: 25 rows (matches local)
   ... (more tables)
============================================================
🎉 Migration completed successfully!
📝 Your application is now configured to use Neon database.
🔄 Restart your backend server to use the new database connection.
```

## 🔄 Post-Migration Steps

### 1. Restart Your Backend Server

Stop and restart your backend server to use the new Neon connection:

```bash
# Stop current server (Ctrl+C)
# Then restart
npm run dev
# or
npm start
```

### 2. Test Application Functionality

- **Login/Registration**: Test user authentication
- **Office Management**: Verify office data and creation
- **Reviews System**: Check reviews and ratings
- **Admin Panel**: Test admin functionality
- **Reports**: Verify report generation works

### 3. Monitor Performance

- Check response times
- Monitor database connection logs
- Verify all API endpoints work correctly

## 🛠️ Troubleshooting

### Common Issues and Solutions

#### 1. Connection Timeout
```
Error: connect ETIMEDOUT
```
**Solution**: Check your internet connection and Neon database status.

#### 2. Authentication Failed
```
Error: password authentication failed
```
**Solution**: Verify your DATABASE_URL credentials in `.env`.

#### 3. Permission Denied
```
Error: permission denied for table
```
**Solution**: Ensure your Neon user has proper permissions.

#### 4. Table Already Exists
```
Error: relation "users" already exists
```
**Solution**: The script handles this automatically, but you can manually clear Neon DB if needed.

### Manual Recovery

If migration fails, you can restore your local database:

```bash
# Find your backup file
node backup-local-db.js --list

# Restore using the generated restore script
node backups/restore_YYYY-MM-DD_HH-MM-SS.js
```

## 📁 File Structure

After migration, you'll have these new files:

```
Backend/
├── migrate-to-neon.js          # Main migration script
├── run-neon-migration.js       # Interactive migration runner
├── backup-local-db.js          # Backup utility
├── backups/                    # Backup files directory
│   ├── negari_backup_*.sql     # Database backups
│   └── restore_*.js            # Restore scripts
├── exports/                    # Export files directory
│   └── local_export_*.sql      # Migration export files
└── .env                        # Updated with Neon config
```

## 🔒 Security Notes

- **Backup files** contain sensitive data - keep them secure
- **Database credentials** are stored in `.env` - don't commit to version control
- **Local database** remains unchanged as a backup
- **Neon connection** uses SSL encryption

## 📞 Support

If you encounter issues during migration:

1. **Check the logs** for specific error messages
2. **Verify prerequisites** are met
3. **Test connections** manually using psql
4. **Restore from backup** if needed
5. **Contact support** with specific error details

## ✅ Migration Checklist

- [ ] Prerequisites verified
- [ ] Backup created successfully
- [ ] Migration completed without errors
- [ ] Table counts match between local and Neon
- [ ] Application functionality tested
- [ ] Backend server restarted
- [ ] Performance monitoring in place

---

**🎉 Congratulations!** Your Negari application is now running on Neon cloud database with all your existing data preserved.

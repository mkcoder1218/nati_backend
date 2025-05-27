# Database Migration Guide

This guide explains how to run the database migrations to fix the government dashboard real data issues.

## Overview

The migration `007_ensure_office_assignments.sql` addresses the following issues:

1. **Office Assignment**: Ensures government officials are properly assigned to offices
2. **Sample Data Creation**: Creates realistic sample data for offices that don't have any reviews
3. **Data Integrity**: Ensures proper foreign key relationships and indexes

## What the Migration Does

### 1. Database Structure
- Ensures `office_id` column exists in the `users` table
- Creates proper foreign key constraints
- Adds performance indexes

### 2. Sample Data Generation
- Creates 8 realistic reviews per office (if no reviews exist)
- Includes proper sentiment analysis data
- Covers various rating levels (1-5 stars)
- Categorizes issues (Service Quality, Staff Performance, etc.)

### 3. Official Assignment
- Assigns unassigned government officials to offices
- Ensures each office has a dedicated official account
- Maintains one-to-one office-official relationships

## How to Run the Migration

### Option 1: Run the Full Migration (Recommended)

```bash
cd Backend
node run-migration.js 007_ensure_office_assignments.sql
```

### Option 2: Run Just the Office Assignment

```bash
cd Backend
node assign-officials-to-offices.js
```

### Option 3: Run Any Specific Migration

```bash
cd Backend
node run-migration.js [migration-filename.sql]
```

## Expected Output

When you run the migration, you should see:

```
🚀 Running migration: 007_ensure_office_assignments.sql
NOTICE:  Office Addis Ababa City Administration has no reviews, creating sample data
NOTICE:  Created 8 sample reviews for office: Addis Ababa City Administration
NOTICE:  Assigned Government Official (official@addisababa.gov.et) to Addis Ababa City Administration
✅ Migration completed successfully: 007_ensure_office_assignments.sql

📊 Verification:
✅ 1 officials assigned to offices:
   Government Official (official@addisababa.gov.et) → Addis Ababa City Administration

📝 Office review counts:
   Addis Ababa City Administration: 8 reviews
   Kirkos Woreda Office: 8 reviews
   Bole Sub City Office: 8 reviews
```

## Verification

After running the migration, you can verify the results by:

1. **Checking Official Assignments**:
   ```sql
   SELECT u.email, u.full_name, o.name as office_name
   FROM users u
   LEFT JOIN offices o ON u.office_id = o.office_id
   WHERE u.role = 'official' AND u.office_id IS NOT NULL;
   ```

2. **Checking Review Data**:
   ```sql
   SELECT o.name, COUNT(r.review_id) as review_count
   FROM offices o
   LEFT JOIN reviews r ON o.office_id = r.office_id
   GROUP BY o.office_id, o.name
   ORDER BY review_count DESC;
   ```

3. **Checking Sentiment Data**:
   ```sql
   SELECT o.name, sl.sentiment, COUNT(*) as count
   FROM offices o
   JOIN reviews r ON o.office_id = r.office_id
   JOIN sentiment_logs sl ON r.review_id = sl.review_id
   GROUP BY o.office_id, o.name, sl.sentiment
   ORDER BY o.name, sl.sentiment;
   ```

## Troubleshooting

### Common Issues

1. **Connection Error**: Make sure your `.env` file has the correct database credentials
2. **Permission Error**: Ensure your database user has CREATE and INSERT permissions
3. **No Citizens Found**: The migration needs at least one citizen user to create sample reviews

### Environment Variables

Make sure these are set in your `.env` file:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
# OR individual variables:
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=government_feedback
```

## What Happens After Migration

1. **Government Dashboard**: Will show real, office-specific data instead of mock data
2. **Official Accounts**: Each government official will see only their office's data
3. **Sample Data**: Realistic reviews and sentiment analysis will be available
4. **Reports**: Report generation will work with real data

## Rollback (if needed)

If you need to rollback the migration:

```sql
-- Remove sample data (optional)
DELETE FROM sentiment_logs WHERE review_id IN (
  SELECT review_id FROM reviews WHERE comment LIKE '%sample%'
);
DELETE FROM reviews WHERE comment LIKE '%sample%';

-- Unassign officials (optional)
UPDATE users SET office_id = NULL WHERE role = 'official';
```

## Next Steps

After running the migration:

1. Restart your backend server
2. Login as a government official
3. Check the dashboard for real, office-specific data
4. Generate reports to verify functionality

The dashboard should now display accurate, office-specific statistics instead of random mock data.

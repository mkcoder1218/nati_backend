# Schema Compatibility Fixes for Negari Government Service Feedback System

## Overview
The original schema.sql and data.sql files had several incompatibilities that would prevent successful database import. This document outlines all the issues identified and the fixes applied.

## Issues Identified and Fixed

### 1. **Duplicate User Data**
**Problem**: The data.sql file contained duplicate INSERT statements for users (lines 38-46 were duplicates of lines 4-11).
**Fix**: Removed the duplicate user INSERT statements to prevent primary key constraint violations.

### 2. **Missing Rating Constraint**
**Problem**: The reviews table was missing the CHECK constraint for rating values (should be between 1-5).
**Fix**: Added `CHECK (rating >= 1 AND rating <= 5)` constraint to the rating column.

### 3. **Missing UNIQUE Constraint on Email**
**Problem**: The users table was missing the UNIQUE constraint on the email field.
**Fix**: Added `UNIQUE` constraint to the email column in the users table.

### 4. **Inconsistent Foreign Key Constraints**
**Problem**: Foreign key constraints had inconsistent ON DELETE behaviors compared to the migration files.
**Fix**: Updated all foreign key constraints to match the migration specifications:
- `users.user_id` references: `ON DELETE SET NULL` for reviews, `ON DELETE CASCADE` for others
- `offices.office_id` references: `ON DELETE CASCADE` for most tables, `ON DELETE SET NULL` for parent_office_id
- `reviews.review_id` references: `ON DELETE CASCADE`

### 5. **Missing Enum Types**
**Problem**: The schema was missing some enum types that are used in the application.
**Fix**: Added missing enum types:
- `entity_type` AS ENUM ('review', 'office', 'service', 'user', 'comment')
- `notification_type` AS ENUM ('info', 'warning', 'success', 'error')

### 6. **Missing Notifications Table**
**Problem**: The notifications table was completely missing from the schema despite being referenced in the application.
**Fix**: Added the complete notifications table definition with all required columns and constraints.

### 7. **Missing Sample Data**
**Problem**: Some tables (office_votes, notifications) had no sample data despite existing in the schema.
**Fix**: Added sample data for:
- **office_votes**: 4 sample votes for the Yeka Sub-City Office
- **notifications**: 3 sample notifications for different users and scenarios

## Files Modified

### 1. **Backend/exports/schema.sql**
- Added missing enum types (entity_type, notification_type)
- Added UNIQUE constraint to users.email
- Added CHECK constraint to reviews.rating
- Updated all foreign key constraints with proper ON DELETE behaviors
- Added complete notifications table definition

### 2. **Backend/exports/data.sql**
- Removed duplicate user INSERT statements
- Added sample data for office_votes table
- Added sample data for notifications table

### 3. **Backend/exports/full_export_corrected.sql** (NEW)
- Created a complete, corrected export file combining the fixed schema and data
- This file can be used for clean database imports

## Database Tables Included

The corrected schema now includes all required tables:
1. **users** - User accounts with roles (citizen, official, admin)
2. **offices** - Government offices with hierarchical structure
3. **reviews** - User reviews and ratings for offices
4. **comments** - User comments for moderation
5. **office_votes** - Upvote/downvote system for offices
6. **sentiment_logs** - AI sentiment analysis results
7. **service_guides** - Service information and guides
8. **votes** - Voting system for reviews (helpful/not_helpful/flag)
9. **notifications** - System notifications for users

## Data Consistency

All foreign key relationships are now properly maintained:
- All user_id references point to existing users
- All office_id references point to existing offices
- All review_id references point to existing reviews
- Parent-child office relationships are properly maintained
- Vote relationships are consistent with existing reviews and users

## Usage

To use the corrected files:

1. **For schema only**: Use `Backend/exports/schema.sql`
2. **For data only**: Use `Backend/exports/data.sql`
3. **For complete import**: Use `Backend/exports/full_export_corrected.sql`

All files are now compatible with PostgreSQL and should import without errors.

## Testing Recommendations

Before deploying to production:
1. Test the import on a clean PostgreSQL database
2. Verify all foreign key constraints are working
3. Test basic CRUD operations on all tables
4. Verify enum type constraints are enforced
5. Test the application functionality with the new schema

## Notes

- The corrected schema maintains backward compatibility with existing application code
- All enum values match those used in the application
- Sample data provides realistic examples for testing
- Foreign key constraints ensure data integrity

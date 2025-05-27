# Reply System Setup Guide

This guide will help you set up the reply system for the Government Service Feedback System.

## Database Setup

The reply system requires a new table `review_replies` to be created in your database. 

### Option 1: Using Database Client (Recommended)

Connect to your database using your preferred database client (pgAdmin, DBeaver, etc.) and run the following SQL:

```sql
-- Create review_replies table
CREATE TABLE IF NOT EXISTS review_replies (
  reply_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY (review_id) REFERENCES reviews(review_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_review_replies_review_id ON review_replies(review_id);
CREATE INDEX IF NOT EXISTS idx_review_replies_user_id ON review_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_review_replies_created_at ON review_replies(created_at);
```

### Option 2: Using psql Command Line

If you have psql installed, you can run:

```bash
psql "your_database_connection_string" -f src/db/migrations/create_review_replies_table.sql
```

### Option 3: Using Node.js Script

Run the setup script:

```bash
node create_review_replies_table.js
```

## Verification

After creating the table, you can verify it exists by running:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'review_replies';
```

## Features Enabled

Once the table is created, the following features will be available:

1. **Government Officials Can:**
   - View all citizen reviews with existing replies
   - Reply directly to citizen reviews
   - See their replies displayed with official badges
   - Filter reviews by response status (responded/pending/flagged)

2. **Reply System Features:**
   - Nested reply structure
   - Real-time updates after posting replies
   - Proper user role identification
   - Timestamp formatting
   - Reply count tracking

## API Endpoints

The following new API endpoints are available:

- `POST /api/review-replies/review/:reviewId` - Create a reply to a review
- `GET /api/review-replies/review/:reviewId` - Get all replies for a review
- `GET /api/review-replies/user/:userId` - Get all replies by a user
- `GET /api/review-replies/:replyId` - Get a specific reply
- `PUT /api/review-replies/:replyId` - Update a reply
- `DELETE /api/review-replies/:replyId` - Delete a reply
- `GET /api/review-replies` - Get all replies (admin/official only)

## Testing

To test the reply functionality:

1. Start the backend server
2. Navigate to `/government/feedback` as a government official
3. View citizen reviews and their comments
4. Use the reply button to respond to reviews
5. See replies appear immediately with official badges

## Troubleshooting

If you encounter issues:

1. **"relation 'review_replies' does not exist"**: The table hasn't been created yet. Follow the database setup steps above.

2. **Permission errors**: Ensure your database user has CREATE TABLE permissions.

3. **Foreign key constraint errors**: Ensure the `reviews` and `users` tables exist and have the correct structure.

4. **Reply button not working**: Check the browser console for errors and ensure the backend server is running.

## Security Notes

- Only authenticated government officials and admins can create replies
- Proper authorization checks are implemented in all controllers
- SQL injection protection is provided through parameterized queries
- User role validation ensures only authorized users can reply

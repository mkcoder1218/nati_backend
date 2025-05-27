// Simple script to create notifications table
const { Client } = require('pg');

async function createTable() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres', // Change this to your actual password
    database: 'government_feedback',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Create the SQL commands
    const commands = [
      `DO $$ BEGIN
        CREATE TYPE notification_type AS ENUM ('info', 'warning', 'success', 'error');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`,
      
      `DO $$ BEGIN
        CREATE TYPE entity_type AS ENUM ('review', 'office', 'service', 'user', 'comment');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`,
      
      `CREATE TABLE IF NOT EXISTS notifications (
        notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type notification_type NOT NULL DEFAULT 'info',
        related_entity_type entity_type,
        related_entity_id UUID,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      );`,
      
      `CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);`
    ];

    // Execute each command
    for (const command of commands) {
      await client.query(command);
      console.log('✓ Executed command');
    }

    // Verify table exists
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
      );
    `);

    if (result.rows[0].exists) {
      console.log('✅ SUCCESS: Notifications table created!');
    } else {
      console.log('❌ FAILED: Table was not created');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

createTable();

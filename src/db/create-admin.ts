import bcrypt from 'bcryptjs';
import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import readline from 'readline';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to prompt user for input
function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Function to validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Function to validate Ethiopian phone number
function isValidPhone(phone: string): boolean {
  const phoneRegex = /^(\+251|0)[79]\d{8}$/;
  return phoneRegex.test(phone);
}

async function createAdminAccount() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Admin Account Creation Tool');
    console.log('================================\n');
    
    // Get admin details from user input
    let email: string;
    do {
      email = await askQuestion('Enter admin email: ');
      if (!isValidEmail(email)) {
        console.log('❌ Invalid email format. Please try again.');
      }
    } while (!isValidEmail(email));
    
    // Check if user already exists
    const existingUser = await client.query(
      'SELECT email FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      console.log('❌ User with this email already exists!');
      const overwrite = await askQuestion('Do you want to update this user to admin role? (y/N): ');
      
      if (overwrite.toLowerCase() === 'y' || overwrite.toLowerCase() === 'yes') {
        // Update existing user to admin role
        await client.query(
          'UPDATE users SET role = $1 WHERE email = $2',
          ['admin', email]
        );
        console.log('✅ User role updated to admin successfully!');
        return;
      } else {
        console.log('❌ Operation cancelled.');
        return;
      }
    }
    
    let password: string;
    do {
      password = await askQuestion('Enter admin password (min 6 characters): ');
      if (password.length < 6) {
        console.log('❌ Password must be at least 6 characters long.');
      }
    } while (password.length < 6);
    
    const fullName = await askQuestion('Enter admin full name: ');
    
    let phoneNumber: string;
    do {
      phoneNumber = await askQuestion('Enter admin phone number (Ethiopian format): ');
      if (!isValidPhone(phoneNumber)) {
        console.log('❌ Invalid phone number. Use format: +251911234567 or 0911234567');
      }
    } while (!isValidPhone(phoneNumber));
    
    console.log('\n📋 Admin Account Details:');
    console.log(`Email: ${email}`);
    console.log(`Full Name: ${fullName}`);
    console.log(`Phone: ${phoneNumber}`);
    console.log(`Role: admin`);
    
    const confirm = await askQuestion('\nCreate this admin account? (Y/n): ');
    
    if (confirm.toLowerCase() === 'n' || confirm.toLowerCase() === 'no') {
      console.log('❌ Operation cancelled.');
      return;
    }
    
    // Start transaction
    await client.query('BEGIN');
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const adminId = uuidv4();
    
    // Create admin user
    await client.query(
      `INSERT INTO users (user_id, email, password, role, full_name, phone_number, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [adminId, email, hashedPassword, 'admin', fullName, phoneNumber]
    );
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('\n✅ Admin account created successfully!');
    console.log('\n🔑 Login Credentials:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Role: admin`);
    console.log('\n🌐 You can now login at: http://localhost:3001/auth/signin');
    
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('❌ Error creating admin account:', error);
    throw error;
  } finally {
    client.release();
    pool.end();
    rl.close();
  }
}

// Handle command line arguments for non-interactive mode
async function createAdminNonInteractive() {
  const args = process.argv.slice(2);
  
  if (args.length < 4) {
    console.log('Usage: npm run create-admin <email> <password> <full_name> <phone_number>');
    console.log('Example: npm run create-admin admin@negari.gov.et mypassword123 "System Administrator" +251911234567');
    return;
  }
  
  const [email, password, fullName, phoneNumber] = args;
  
  if (!isValidEmail(email)) {
    console.log('❌ Invalid email format');
    return;
  }
  
  if (password.length < 6) {
    console.log('❌ Password must be at least 6 characters long');
    return;
  }
  
  if (!isValidPhone(phoneNumber)) {
    console.log('❌ Invalid phone number format');
    return;
  }
  
  const client = await pool.connect();
  
  try {
    // Check if user already exists
    const existingUser = await client.query(
      'SELECT email FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      console.log('❌ User with this email already exists!');
      return;
    }
    
    // Start transaction
    await client.query('BEGIN');
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const adminId = uuidv4();
    
    // Create admin user
    await client.query(
      `INSERT INTO users (user_id, email, password, role, full_name, phone_number, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [adminId, email, hashedPassword, 'admin', fullName, phoneNumber]
    );
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('✅ Admin account created successfully!');
    console.log(`Email: ${email}`);
    console.log(`Role: admin`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating admin account:', error);
    throw error;
  } finally {
    client.release();
    pool.end();
  }
}

// Check if running in non-interactive mode
if (process.argv.length > 2) {
  createAdminNonInteractive()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  createAdminAccount()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

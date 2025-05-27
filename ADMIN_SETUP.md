# Admin Account Setup Guide

This guide explains how to create and manage admin accounts for the Government Service Feedback System (Negari).

## Quick Start - Default Admin Account

The system comes with a default admin account that can be created using the seed script:

```bash
cd Backend
npm run seed-db
```

**Default Admin Credentials:**
- **Email:** `admin@example.com`
- **Password:** `password`
- **Role:** `admin`

## Creating Custom Admin Accounts

### Method 1: Interactive Admin Creation

Run the interactive admin creation tool:

```bash
cd Backend
npm run create-admin
```

This will prompt you for:
- Admin email address
- Password (minimum 6 characters)
- Full name
- Phone number (Ethiopian format)

### Method 2: Non-Interactive Admin Creation

Create an admin account with command line arguments:

```bash
cd Backend
npm run create-admin admin@negari.gov.et mypassword123 "System Administrator" +251911234567
```

**Arguments:**
1. Email address
2. Password
3. Full name (use quotes if it contains spaces)
4. Phone number (Ethiopian format: +251XXXXXXXXX or 0XXXXXXXXX)

## Verifying Admin Accounts

Check existing admin accounts:

```bash
cd Backend
npm run verify-admin
```

This will show:
- List of all admin accounts
- Account details (email, name, phone, creation date)
- Login credentials for default accounts
- Login URL

## Admin Account Features

Admin accounts have access to:

### 🏢 Office Management
- Create, edit, and delete government offices
- Assign officials to offices
- Manage office information and services

### 👥 User Management
- View all users (citizens, officials, admins)
- Change user roles
- Delete user accounts
- Create new user accounts

### 📊 System Analytics
- View system-wide statistics
- Access comprehensive reports
- Monitor user activity

### 💬 Content Moderation
- Review flagged comments
- Approve or reject user reviews
- Moderate user-generated content

### 📋 Report Management
- Generate system reports
- Schedule automated reports
- Download analytics data

## Security Best Practices

### 🔐 Password Requirements
- Minimum 6 characters (recommended: 12+ characters)
- Use a mix of letters, numbers, and symbols
- Avoid common passwords

### 📧 Email Guidelines
- Use official government email addresses
- Avoid personal email accounts for admin access
- Consider using role-based emails (admin@agency.gov.et)

### 📱 Phone Number Format
- Ethiopian format: `+251911234567` or `0911234567`
- Must be a valid Ethiopian mobile number

## Troubleshooting

### Admin Account Already Exists
If you try to create an admin with an existing email:
```
❌ User with this email already exists!
Do you want to update this user to admin role? (y/N):
```

Choose 'y' to promote the existing user to admin role.

### Database Connection Issues
Ensure your database is running and environment variables are set:
```bash
# Check database connection
npm run db:test

# Verify environment variables
cat .env
```

### Login Issues
1. Verify admin account exists: `npm run verify-admin`
2. Check if backend server is running: `npm run dev`
3. Ensure frontend is accessible: http://localhost:3001
4. Clear browser cache and cookies

## Environment Setup

Make sure your `.env` file contains:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=government_feedback
JWT_SECRET=your_jwt_secret
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run seed-db` | Create default admin + sample data |
| `npm run create-admin` | Interactive admin creation |
| `npm run verify-admin` | Check existing admin accounts |
| `npm run migrate` | Run database migrations |
| `npm run setup-db-safe` | Safe database setup (no data loss) |

## Login URLs

- **Development:** http://localhost:3001/auth/signin
- **Production:** https://your-domain.com/auth/signin

## Support

For additional help:
1. Check the main README.md file
2. Review the API documentation
3. Contact the development team

---

**Note:** Always use strong passwords and secure email addresses for admin accounts in production environments.

# NextAuth.js Magic Link Setup Guide

## Overview
This implementation provides secure magic link authentication that validates users against your Airtable free signup data and allows them to upgrade to paid membership.

## Required Environment Variables

Add these to your `.env.local` file:

```bash
# NextAuth.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-key-here

# MongoDB (for NextAuth.js session storage)
MONGODB_URI=mongodb://localhost:27017/bsn-auth

# Email Configuration (for magic links)
# Option 1: Gmail SMTP
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM=noreply@blacksustainability.org

# Option 2: SendGrid (alternative)
# EMAIL_SERVER_HOST=smtp.sendgrid.net
# EMAIL_SERVER_PORT=587
# EMAIL_SERVER_USER=apikey
# EMAIL_SERVER_PASSWORD=your-sendgrid-api-key
# EMAIL_FROM=noreply@blacksustainability.org

# Option 3: Resend (alternative)
# You would use Resend's API directly instead of SMTP
# RESEND_API_KEY=your-resend-api-key

# Existing Airtable Configuration (for free signup data)
NEXT_PUBLIC_DEV_AIRTABLE_ACCESS_TOKEN=your-dev-airtable-token
NEXT_PUBLIC_DEV_AIRTABLE_BASE_ID=your-dev-base-id
NEXT_PUBLIC_DEV_AIRTABLE_TABLE_NAME=your-dev-table-name

# Main Airtable Configuration (for paid membership data)
NEXT_PUBLIC_AIRTABLE_ACCESS_TOKEN=your-main-airtable-token
NEXT_PUBLIC_AIRTABLE_BASE_ID=your-main-base-id
NEXT_PUBLIC_AIRTABLE_TABLE_NAME=your-main-table-name
```

## Setup Steps

### 1. Generate NextAuth Secret
```bash
openssl rand -base64 32
```
Add this as your `NEXTAUTH_SECRET`

### 2. Set up MongoDB
You can use:
- **Local MongoDB**: Install MongoDB locally
- **MongoDB Atlas**: Free cloud database
- **Vercel's MongoDB**: If deploying to Vercel

### 3. Configure Email Provider

#### Option A: Gmail (Easy setup)
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password: https://support.google.com/accounts/answer/185833
3. Use the app password as `EMAIL_SERVER_PASSWORD`

#### Option B: SendGrid (Recommended for production)
1. Sign up at https://sendgrid.com
2. Create an API key
3. Use `apikey` as username and your API key as password

#### Option C: Resend (Developer-friendly)
1. Sign up at https://resend.com
2. Get your API key
3. You'll need to modify the NextAuth config to use Resend's API instead of SMTP

### 4. Airtable Configuration
Make sure you have:
- **Free signup table** (dev environment)
- **Main membership table** (production environment)
- Both tables should have compatible field structures

## How It Works

### Authentication Flow
1. **User visits** `/upgrade` or `/auth/signin`
2. **Enters email** → System sends magic link
3. **Clicks magic link** → NextAuth validates token
4. **Custom validation** → Checks if email exists in free signup Airtable
5. **If valid** → User authenticated + free signup data loaded
6. **Access granted** → User sees upgrade form with pre-populated data

### Magic Link Email
Users receive a professional email with:
- BSN branding
- Clear call-to-action button
- 24-hour expiration
- Security messaging

### Security Features
- ✅ **Token-based authentication** - No passwords to manage
- ✅ **Time-limited links** - 24-hour expiration
- ✅ **Single-use tokens** - Links can't be reused
- ✅ **CSRF protection** - Built into NextAuth.js
- ✅ **Database sessions** - Secure session management
- ✅ **Email verification** - Only email owners can authenticate

## Available Routes

- `/auth/signin` - Custom sign-in page
- `/auth/verify-request` - "Check your email" page
- `/auth/error` - Error handling (e.g., no free signup account)
- `/upgrade` - Main upgrade page (requires authentication)

## Testing

1. **Start your development server**
   ```bash
   npm run dev
   ```

2. **Visit the sign-in page**
   ```
   http://localhost:3000/auth/signin
   ```

3. **Enter an email that exists in your free signup table**

4. **Check your email for the magic link**

5. **Click the link to authenticate and access the upgrade form**

## Deployment Notes

### Production Environment Variables
- Set `NEXTAUTH_URL` to your production domain
- Use production MongoDB URI
- Configure production email service
- Set production Airtable credentials

### Vercel Deployment
NextAuth.js works seamlessly with Vercel. Just add your environment variables in the Vercel dashboard.

### Email Deliverability
For production, use a professional email service like SendGrid or Resend to ensure emails reach users' inboxes.

## Troubleshooting

### Common Issues

1. **"Email not sent"**
   - Check email server credentials
   - Verify firewall/network settings
   - Test with a different email provider

2. **"User not found"**
   - Verify email exists in free signup Airtable
   - Check Airtable API credentials
   - Ensure field names match exactly

3. **"Database connection error"**
   - Verify MongoDB URI
   - Check network connectivity
   - Ensure database exists

4. **"Session not persisting"**
   - Check `NEXTAUTH_SECRET` is set
   - Verify MongoDB connection
   - Clear browser cookies and try again

### Debug Mode
Add this to see detailed NextAuth.js logs:
```bash
NEXTAUTH_DEBUG=true
```

## Support

For additional help:
- NextAuth.js Documentation: https://next-auth.js.org
- MongoDB Setup: https://www.mongodb.com/docs
- Email Provider Setup: Check your provider's documentation 
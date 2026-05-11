# Admin System Documentation

## Overview

This admin system provides secure access control for the form versions and schema editor functionality. It includes:

- **Admin Registration API** - Register new admin users via Postman
- **Admin Login System** - JWT-based authentication
- **Admin Dashboard** - Web interface for managing admin features
- **Admin User Management** - View and manage admin users

## Setup Instructions

### 1. Environment Variables

Add these to your `.env.local` file:

```bash
# JWT Secret (generate a secure random string)
JWT_SECRET=your-super-secure-jwt-secret-key-here

# Admin Registration Token (for registering new admins via API)
ADMIN_REGISTRATION_TOKEN=your-secure-registration-token

# Admin Password (for login - consider using a more secure method in production)
ADMIN_PASSWORD=your-admin-password

# MongoDB URI (if not already set)
MONGODB_URI=mongodb://localhost:27017/your-database
```

### 2. Generate Secure Tokens

```bash
# Generate JWT Secret
openssl rand -base64 32

# Generate Registration Token
openssl rand -base64 24
```

## API Endpoints

### 1. Register Admin User

**Endpoint:** `POST /api/admin/register`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "yeamah@blacksustainability.org",
  "name": "Yeamah Brewer",
  "registrationToken": "your-registration-token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Admin user registered successfully",
  "admin": {
    "id": "507f1f77bcf86cd799439011",
    "email": "yeamah@blacksustainability.org",
    "name": "Yeamah Brewer",
    "role": "admin",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. Admin Login

**Endpoint:** `POST /api/admin/login`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "yeamah@blacksustainability.org",
  "password": "your-admin-password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": "507f1f77bcf86cd799439011",
    "email": "yeamah@blacksustainability.org",
    "name": "Yeamah Brewer",
    "role": "admin"
  }
}
```

### 3. Verify Token

**Endpoint:** `GET /api/admin/verify`

**Headers:**
```
Authorization: Bearer your-jwt-token
```

**Response:**
```json
{
  "success": true,
  "admin": {
    "id": "507f1f77bcf86cd799439011",
    "email": "yeamah@blacksustainability.org",
    "name": "Yeamah Brewer",
    "role": "admin",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. List Admin Users

**Endpoint:** `GET /api/admin/users`

**Headers:**
```
Authorization: Bearer your-jwt-token
```

**Response:**
```json
{
  "success": true,
  "admins": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "email": "yeamah@blacksustainability.org",
      "name": "Yeamah Brewer",
      "role": "admin",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "isActive": true
    }
  ]
}
```

### 5. Toggle Admin User Status

**Endpoint:** `POST /api/admin/users/{id}/toggle`

**Headers:**
```
Authorization: Bearer your-jwt-token
Content-Type: application/json
```

**Body:**
```json
{
  "isActive": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Admin user deactivated successfully",
  "isActive": false
}
```

## Web Interface

### Admin Dashboard

**URL:** `http://localhost:3000/admin/dashboard`

Features:
- Login form for admin authentication
- Dashboard with quick access to admin features
- Form versions management
- Schema editor access
- Admin user management
- Quick statistics

### Admin Users Management

**URL:** `http://localhost:3000/admin/users`

Features:
- View all admin users
- Toggle user active/inactive status
- Registration instructions
- User creation dates and status

## Postman Setup

### 1. Register Admin Users

Create a new request in Postman:

**Method:** POST
**URL:** `http://localhost:3000/api/admin/register`
**Headers:**
```
Content-Type: application/json
```
**Body (raw JSON):**
```json
{
  "email": "yeamah@blacksustainability.org",
  "name": "Yeamah Brewer",
  "registrationToken": "your-registration-token"
}
```

### 2. Register Second Admin

**Body:**
```json
{
  "email": "raina@blacksustainability.org",
  "name": "Raina Turner-Greenlea",
  "registrationToken": "your-registration-token"
}
```

## Security Features

### 1. JWT Token Authentication
- 24-hour token expiration
- Secure token verification
- Automatic token refresh handling

### 2. Registration Token Protection
- Required registration token for new admin creation
- Environment variable protection
- Prevents unauthorized admin registration

### 3. Admin Status Management
- Active/inactive admin status
- Prevent self-deactivation
- Secure status toggling

### 4. Database Security
- MongoDB ObjectId validation
- Proper error handling
- Secure query patterns

## Usage Workflow

### 1. Initial Setup
1. Set environment variables
2. Register admin users via Postman
3. Access admin dashboard at `/admin/dashboard`

### 2. Daily Usage
1. Login to admin dashboard
2. Access form versions at `/form-versions`
3. Use schema editor for form management
4. Manage admin users as needed

### 3. Admin Management
1. View all admins at `/admin/users`
2. Toggle user status as needed
3. Register new admins via API when required

## Error Codes

| Code | Description |
|------|-------------|
| `NO_TOKEN` | No authorization token provided |
| `INVALID_TOKEN` | Token is malformed or invalid |
| `TOKEN_EXPIRED` | Token has expired |
| `ADMIN_NOT_FOUND` | Admin user not found in database |
| `USER_NOT_FOUND` | Target user not found for operation |
| `SELF_DEACTIVATION` | Attempting to deactivate own account |
| `ADMIN_EXISTS` | Admin user already exists with email |
| `INVALID_CREDENTIALS` | Invalid login credentials |

## Troubleshooting

### Common Issues

1. **"No token provided"**
   - Ensure you're logged in to the admin dashboard
   - Check that the token is stored in localStorage

2. **"Token expired"**
   - Log out and log back in to get a new token
   - Tokens expire after 24 hours

3. **"Admin user not found"**
   - Verify the admin user exists in the database
   - Check that the user is marked as active

4. **Registration fails**
   - Verify the registration token matches your environment variable
   - Check that the email isn't already registered

### Database Queries

To manually check admin users in MongoDB:

```javascript
// Connect to your database
use your-database-name

// View all admin users
db.adminUsers.find({})

// View active admin users only
db.adminUsers.find({isActive: true})

// Find specific admin by email
db.adminUsers.findOne({email: "yeamah@blacksustainability.org"})
```

## Production Considerations

1. **Use HTTPS** - Always use HTTPS in production
2. **Strong Passwords** - Use strong, unique passwords
3. **Rate Limiting** - Implement rate limiting on login endpoints
4. **Password Hashing** - Hash passwords in production
5. **Audit Logging** - Log admin actions for security
6. **Backup Strategy** - Regular database backups
7. **Monitoring** - Monitor for suspicious activity

## Support

For issues with the admin system:
1. Check the browser console for errors
2. Verify environment variables are set correctly
3. Check MongoDB connection
4. Review error codes in the documentation 
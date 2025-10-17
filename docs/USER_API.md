# 🔐 User API Documentation

Complete user management API with secure authentication, password handling using **Argon2** hashing, and **JWT** token authentication.

## 🚀 Quick Start

1. **Start Server**: `npm run dev`
2. **Import Postman Collection**: `postman/User_API_with_Passwords.postman_collection.json`
3. **Authentication Workflow**:
   - Sign up: `POST /api/users/signup`
   - Login: `POST /api/users/login` → Get JWT token
   - Use token for protected routes: `Authorization: Bearer <token>`
4. **Run Tests**: Use the `.http` files or Postman collection

---

## 🔐 Security Features

- **Argon2id** password hashing (winner of 2015 Password Hashing Competition)
- Configurable security parameters:
  - Memory cost: 64 MB (2^16)
  - Time cost: 3 iterations
  - Parallelism: 1 thread
- Password never returned in API responses
- Input validation and sanitization

---

## 📋 API Endpoints

### 🔒 Authentication Required

**Protected endpoints require a valid JWT token in the Authorization header:**
```
Authorization: Bearer <jwt-token>
```

**Get JWT token by calling the login endpoint first.**

---

### 1. User Signup (PUBLIC)
**`POST /api/users/signup`**

Create a new user account with secure password hashing.

#### Request Body:
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "SecurePassword123!"
}
```

#### Success Response (201):
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john.doe@example.com",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Security Note**: Password hashes are never returned in API responses for security reasons.

#### Validation Rules:
- ✅ **Name**: Minimum 2 characters
- ✅ **Email**: Valid format (name@domain.com)
- ✅ **Password**: Minimum 8 characters
- ✅ **Email Uniqueness**: Must not already exist

#### Error Responses (400):
```json
{ "error": "User name must be at least 2 characters" }
{ "error": "Invalid email format" }
{ "error": "Password must be at least 8 characters" }
{ "error": "User with this email already exists" }
{ "error": "Unable to create user without required fields" }
```

---

### 2. User Login (PUBLIC)
**`POST /api/users/login`**

Authenticate user credentials and return user data.

#### Request Body:
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!"
}
```

#### Success Response (200):
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john.doe@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Note**: Login now returns both user data and a JWT token for authentication. See `docs/JWT_AUTH.md` for detailed JWT usage.

#### Error Responses (401):
```json
{ "error": "Invalid email or password" }
{ "error": "Email and password are required" }
{ "error": "User account is not properly configured" }
```

---

### 3. Get User by ID (PROTECTED)
**`GET /api/users/:userId`**

Retrieve user information by ID. **Requires authentication.**

#### Success Response (200):
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john.doe@example.com",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Error Responses:
- **400**: `{ "error": "User ID is required" }`
- **401**: `{ "error": "Authorization header is required" }`
- **401**: `{ "error": "Invalid or expired token" }`
- **404**: `{ "error": "User with ID 123 not found" }`

---

### 4. Update User (PROTECTED)
**`PATCH /api/users/:userId`**

Update user information (name, email, or password). **Requires authentication.**

#### Request Body (any combination):
```json
{
  "name": "John Smith",
  "email": "john.smith@example.com", 
  "password": "NewSecurePassword456!"
}
```

#### Success Response (200):
```json
{
  "id": 1,
  "name": "John Smith",
  "email": "john.smith@example.com",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Validation Rules:
- **Name**: If provided, minimum 2 characters
- **Email**: If provided, valid format and unique
- **Password**: If provided, minimum 8 characters

#### Error Responses:
- **400**: `{ "error": "User ID is required" }`
- **400**: `{ "error": "Update data is required" }`
- **400**: `{ "error": "Failed to update user. User name must be at least 2 characters" }`
- **400**: `{ "error": "Failed to update user. Invalid email format" }`
- **400**: `{ "error": "Failed to update user. Email is already in use by another user" }`
- **400**: `{ "error": "Failed to update user. Password must be at least 8 characters" }`
- **401**: `{ "error": "Authorization header is required" }`
- **401**: `{ "error": "Invalid or expired token" }`

---

## 🧪 Testing

### HTTP Files
Use `test-signup.http` for comprehensive testing:

```http
### Test User Signup
POST http://localhost:3001/api/users/signup
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "SecurePassword123!"
}

### Test User Login
POST http://localhost:3001/api/users/login
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!"
}
```

### Postman Collection
Import `postman/User_API_with_Passwords.postman_collection.json` for 22+ test cases including:

#### ✅ Success Scenarios:
- Valid user signup
- Successful login
- User profile retrieval
- Profile updates (name, email, password)

#### ❌ Error Scenarios:
- Duplicate email registration
- Invalid email formats
- Weak passwords
- Wrong login credentials
- Missing required fields
- Non-existent users

---

## 🔧 Technical Implementation

### Password Security
- **Algorithm**: Argon2id (most secure variant)
- **Memory**: 64 MB (protection against GPU attacks)
- **Iterations**: 3 (time complexity)
- **Parallelism**: 1 thread
- **Performance**: ~200-500ms hashing time

### Database Schema
```sql
CREATE TABLE "User" (
  "id" SERIAL PRIMARY KEY,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT  -- Stored securely, never exposed in API responses
);
```

### Architecture
- **Model Layer**: Database operations (`userModel.ts`)
- **Service Layer**: Business logic and validation (`userService.ts`)
- **Controller Layer**: HTTP handling (`userController.ts`)
- **Routes**: Express routing (`users.ts`)

---

## 🚨 Error Handling

### Standard Error Format
```json
{
  "error": "Descriptive error message"
}
```

### HTTP Status Codes
- **200**: Success (GET, PATCH)
- **201**: Created (POST signup)
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (login failures)
- **404**: Not Found (user not found)

---

## 🔄 Migration Notes

### From Password-less Version
If upgrading from the previous password-less implementation:

1. **Database**: `passwordHash` field added as optional
2. **Backward Compatibility**: Existing users without passwords can still be retrieved
3. **New Features**: Login and password updates require password to be set

### Future Enhancements
- ✅ **JWT token authentication** (IMPLEMENTED - see `docs/JWT_AUTH.md`)
- Password reset functionality
- Account verification
- Session management
- Rate limiting

---

## 📊 Performance

### Benchmarks
- **Signup**: ~300-500ms (includes Argon2 hashing)
- **Login**: ~200-400ms (includes Argon2 verification)
- **Get User**: ~5-10ms (database lookup only)
- **Update**: ~300-500ms (if password changed)

### Recommendations
- Use connection pooling for high load
- Consider caching for frequently accessed users
- Monitor memory usage with Argon2 parameters
- Implement rate limiting for auth endpoints 
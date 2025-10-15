# 👤 User API - Postman Collection

## 🚀 Overview

Complete user management system with JWT authentication, automatic token refresh, and comprehensive security testing.

## 🔐 Features

- **User Registration** - Secure signup with email validation
- **Authentication** - JWT-based login with refresh tokens
- **Token Management** - Automatic token refresh and rotation
- **Profile Management** - Update user information and passwords
- **Security Testing** - Comprehensive error and security scenarios

## 📁 Collection Structure

### 1. 🔐 Authentication
Core authentication flows with automatic token management:

- **✅ User Signup** - Register new account with validation
- **✅ User Login (Get Tokens)** - Authenticate and receive token pair
- **✅ Refresh Tokens** - Get new access/refresh token pair
- **❌ Login with Invalid Credentials** - Test error handling

### 2. 👤 Protected User Operations
Requires valid access token with auto-refresh:

- **✅ Get User by ID** - Retrieve user profile information
- **✅ Update User** - Modify name, email, or password
- **❌ Get User Without Token** - Test authorization requirement
- **❌ Get User with Invalid Token** - Test token validation

### 3. 🧪 Token Lifecycle Tests
Advanced token testing scenarios:

- **✅ Token Rotation Test** - Verify new tokens after refresh
- **✅ Use New Tokens** - Test newly refreshed tokens
- **❌ Use Old Token After Refresh** - Verify old tokens are invalidated

### 4. ❌ Error Test Cases
Comprehensive error scenario coverage:

- **❌ Signup with Duplicate Email** - Email uniqueness validation
- **❌ Signup with Weak Password** - Password strength validation
- **❌ Invalid Update Data** - Data validation testing
- **❌ Malformed JSON** - Request format validation

### 5. 🧹 Cleanup
Reset collection state:

- **🗑️ Clear All Tokens** - Reset stored authentication data

## 🔧 Collection Variables

| Variable | Purpose | Auto-managed | Example |
|----------|---------|--------------|---------|
| `baseUrl` | API host | ❌ Manual | `http://localhost:3001` |
| `V_1` | v1 API prefix | ❌ Manual | `/api/v1` |
| `V_2` | v2 API prefix | ❌ Manual | `/api/v2` |
| `userId` | Current user ID | ✅ Auto | `1` |
| `testEmail` | Test account email | ❌ Manual | `john.doe@example.com` |
| `testPassword` | Test account password | ❌ Manual | `SecurePassword123!` |
| `accessToken` | Short-lived API token | ✅ Auto | `eyJhbGciOiJIUzI1...` |
| `refreshToken` | Long-lived refresh token | ✅ Auto | `eyJhbGciOiJIUzI1...` |

## 🔄 Automatic Token Management

The collection includes intelligent pre-request scripts that automatically handle token refresh:

### Token Refresh Logic
```javascript
// Checks if access token expires in < 1 minute
if (timeUntilExpiry < 60) {
    // Automatically calls refresh endpoint
    // Updates stored tokens
    // Continues with original request
}
```

### Benefits
- 🚀 **Zero Manual Intervention** - Tokens refresh automatically
- 🔒 **Always Fresh Tokens** - Never use expired tokens  
- 📈 **Better Test Reliability** - No random 401 errors
- 🎯 **Focus on Logic** - Not token management

## 🧪 Test Scenarios

### ✅ Success Cases
- **Account Creation**: Valid user registration
- **Authentication**: Login with correct credentials
- **Token Operations**: Refresh and token rotation
- **Profile Updates**: Modify user information
- **Data Validation**: Proper response structures

### ❌ Error Cases
- **Invalid Credentials**: Wrong email/password combinations
- **Expired Tokens**: Test token expiry handling
- **Validation Failures**: Weak passwords, invalid emails
- **Authorization Errors**: Missing or invalid tokens
- **Duplicate Data**: Email uniqueness constraints

### 🔄 Edge Cases
- **Token Expiry Timing**: Test refresh before expiration
- **Concurrent Requests**: Multiple simultaneous operations
- **Malformed Requests**: Invalid JSON, missing headers
- **Security Boundaries**: Unauthorized access attempts

## 📊 Response Validation

Each request includes comprehensive test assertions:

### Status Code Validation
```javascript
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});
```

### Response Structure Validation
```javascript
pm.test('Response has required fields', function () {
    const responseJson = pm.response.json();
    pm.expect(responseJson).to.have.property('user');
    pm.expect(responseJson).to.have.property('accessToken');
});
```

### Security Validation
```javascript
pm.test('Password hash not exposed', function () {
    const responseJson = pm.response.json();
    pm.expect(responseJson).to.not.have.property('passwordHash');
});
```

### Token Validation
```javascript
pm.test('Access token is valid JWT', function () {
    const token = pm.response.json().accessToken;
    const tokenParts = token.split('.');
    pm.expect(tokenParts).to.have.length(3);
});
```

## 🎬 Usage Workflow

### 1. Initial Setup
1. **Import Collection** into Postman
2. **Set Environment Variables** (baseUrl, testEmail, testPassword)
3. **Run Signup** to create test account
4. **Run Login** to get initial tokens

### 2. Testing Flow
1. **Authentication Tests** - Verify login/signup functionality
2. **Protected Operations** - Test authenticated endpoints
3. **Token Lifecycle** - Test refresh and rotation
4. **Error Scenarios** - Test failure cases
5. **Cleanup** - Clear tokens when done

### 3. Automated Testing
Use Collection Runner for automated testing:
```bash
# Run via Newman CLI
newman run User_API.postman_collection.json \
  --environment environment.json \
  --reporters html,cli
```

## 🔐 Security Features

- **JWT Authentication** - Industry standard token-based auth
- **Token Rotation** - Refresh tokens create new token pairs
- **Auto-refresh** - Prevents expired token usage
- **Password Hashing** - Argon2 secure password storage
- **No Token Hardcoding** - All tokens dynamically managed
- **Secure Cleanup** - Proper token cleanup procedures

## 🛠️ Environment Configuration

### Required Variables
```json
{
  "baseUrl": "http://localhost:3001",
  "V_1": "/api/v1",
  "V_2": "/api/v2",
  "testEmail": "your-test@email.com",
  "testPassword": "YourSecurePassword123!"
}
```

### Optional Variables
```json
{
  "timeout": 5000,
  "retries": 3,
  "debugMode": false
}
```

## 🐛 Troubleshooting

### Common Issues

1. **401 Unauthorized Errors**
   - Ensure you've run login request first
   - Check token auto-refresh in console logs
   - Verify environment variables are set

2. **Token Not Saving**
   - Check collection variables are enabled
   - Verify test script execution
   - Ensure JSON response structure is correct

3. **Auto-refresh Not Working**
   - Enable Postman console to see logs
   - Check refresh token validity
   - Verify base URL is accessible

### Debug Mode
Enable Postman Console (`View > Show Postman Console`) to monitor:
- Token refresh attempts
- Pre-request script execution
- API response details
- Auto-refresh decisions

## 📈 Performance Considerations

- **Response Time Testing** - All requests include timing assertions
- **Token Caching** - Efficient token reuse
- **Minimal Requests** - Auto-refresh only when needed
- **Parallel Execution** - Collection runner optimization

## 🔄 Updates & Maintenance

This collection is maintained to match the latest API changes:
- New authentication endpoints
- Updated security requirements
- Enhanced error handling
- Performance improvements

**Last Updated**: Synchronized with API development 
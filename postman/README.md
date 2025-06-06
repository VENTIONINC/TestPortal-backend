# 📮 Postman Collection: User API with Refresh Tokens

## 🚀 Quick Start

1. **Import Collection**: Import `User_API_with_Refresh_Tokens.postman_collection.json` (the only collection needed)
2. **Set Environment**: Configure your base URL (default: `http://localhost:3001`) and ensure `V_1` and `V_2` variables are set to `/api/v1` and `/api/v2`
3. **Run Tests**: Execute the collection folder by folder for best results

## 🔐 Smart Token Management

This collection includes **automatic token management**:

- ✅ **Auto-saves tokens** from login/refresh responses
- ✅ **Auto-refreshes** tokens when they expire
- ✅ **Smart pre-request scripts** handle token rotation
- ✅ **Bearer token authentication** configured at collection level

## 📁 Collection Structure

### 1. 🔐 Authentication
Core authentication flows:
- **User Signup** - Register new account
- **User Login** - Get access + refresh tokens  
- **Refresh Tokens** - Get new token pair
- **Error Cases** - Invalid credentials, missing tokens

### 2. 👤 Protected User Operations
Requires valid access token:
- **Get User by ID** - Retrieve user profile
- **Update User** - Modify name, email, password
- **Authorization Tests** - With/without tokens

### 3. 🧪 Token Lifecycle Tests
Advanced token testing:
- **Token Rotation** - Verify new tokens on refresh
- **Token Validation** - Use new tokens after refresh
- **Old Token Tests** - Check old tokens are invalid

### 4. ❌ Error Test Cases
Comprehensive error scenarios:
- **Duplicate Email** - Registration conflicts
- **Weak Passwords** - Validation errors
- **Invalid Data** - Malformed requests

### 5. 🧹 Cleanup
- **Clear Tokens** - Reset all stored tokens

## 🔧 Collection Variables

| Variable | Purpose | Auto-managed |
|----------|---------|--------------|
| `baseUrl` | API host (no version) | ❌ Manual |
| `V_1` | v1 API prefix (`/api/v1`) | ❌ Manual |
| `V_2` | v2 API prefix (`/api/v2`) | ❌ Manual |
| `userId` | Current user ID | ✅ Auto |
| `testEmail` | Test account email | ❌ Manual |
| `testPassword` | Test account password | ❌ Manual |
| `accessToken` | Short-lived API token | ✅ Auto |
| `refreshToken` | Long-lived refresh token | ✅ Auto |

## 🚦 Running Tests

### 🎯 Recommended Flow

1. **Setup**: Run "🔐 Authentication" folder first
2. **Testing**: Use "👤 Protected User Operations" 
3. **Advanced**: Try "🧪 Token Lifecycle Tests"
4. **Cleanup**: Run "🧹 Cleanup" when done

### ⚡ Collection Runner

For automated testing:
1. Select entire collection or specific folders
2. Set iterations (1 for setup, multiple for stress testing)
3. Enable "Save responses" for debugging
4. Monitor test results and token rotation

## 🔄 Token Auto-Refresh

The collection includes intelligent **pre-request scripts** that:

```javascript
// Checks if access token expires in < 1 minute
if (timeUntilExpiry < 60) {
    // Automatically calls refresh endpoint
    // Updates stored tokens
    // Continues with original request
}
```

### Benefits:
- 🚀 **Zero Manual Intervention** - Tokens refresh automatically
- 🔒 **Always Fresh Tokens** - Never use expired tokens
- 📈 **Better Test Reliability** - No random 401 errors
- 🎯 **Focus on Logic** - Not token management

## 🧪 Test Scenarios

### ✅ Success Cases
- Account creation and login
- Token refresh and rotation
- Authenticated operations
- Data validation

### ❌ Error Cases  
- Invalid credentials
- Expired/malformed tokens
- Validation failures
- Authorization errors

### 🔄 Edge Cases
- Token expiry timing
- Concurrent requests
- Missing headers
- Malformed JSON

## 📊 Response Validation

Each request includes comprehensive tests:

```javascript
// Status code validation
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

// Response structure validation
pm.test('Response has required fields', function () {
    const responseJson = pm.response.json();
    pm.expect(responseJson).to.have.property('user');
    pm.expect(responseJson).to.have.property('accessToken');
});

// Security validation
pm.test('Password hash not exposed', function () {
    const responseJson = pm.response.json();
    pm.expect(responseJson).to.not.have.property('passwordHash');
});
```

## 🔐 Security Features

- **No hardcoded tokens** - All tokens are dynamically managed
- **Secure storage** - Tokens stored in collection variables only
- **Auto-cleanup** - Cleanup folder clears all sensitive data
- **Token validation** - Tests verify JWT structure and content

## 🛠️ Customization

### Environment Setup
```json
{
  "baseUrl": "https://your-api.com",
  "V_1": "/api/v1",
  "V_2": "/api/v2",
  "testEmail": "your-test@email.com",
  "testPassword": "YourSecurePassword123!"
}
```

### Custom Test Scripts
Add your own validation logic:
```javascript
pm.test('Custom validation', function () {
    // Your test logic here
});
```

## 🐛 Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check if you ran login first
   - Verify token auto-refresh is working
   - Check console logs for refresh attempts

2. **Tokens not saving**
   - Ensure collection variables are enabled
   - Check test script execution
   - Verify JSON response structure

3. **Auto-refresh not working**
   - Check pre-request script console logs
   - Verify refresh token validity
   - Ensure base URL is correct

### Debug Mode
Enable Postman console (`View > Show Postman Console`) to see:
- Token refresh attempts
- Pre-request script execution
- Auto-refresh decisions

## 📈 Performance Tips

- **Use Collection Runner** for bulk testing
- **Enable parallel execution** for faster runs
- **Save responses** only when debugging
- **Clear tokens** between test runs

## 🔗 Related Documentation

- [Refresh Token Implementation Guide](../docs/REFRESH_TOKEN_GUIDE.md)
- [User API Documentation](../docs/USER_API.md)
- [OpenAPI Specification](http://localhost:3001/api/openapi.json)

---

**Happy Testing! 🚀** 
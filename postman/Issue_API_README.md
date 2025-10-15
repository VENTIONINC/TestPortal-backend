# 📋 Postman Collection: Issue API

## 🚀 Quick Start

1. **Import Collection**: Import `Issue_API.postman_collection.json`
2. **Set Environment**: Configure your base URL (default: `http://localhost:3001`)
3. **Get Auth Token**: Run "🔐 Setup Authentication" → "User Login" to get tokens
4. **Test APIs**: Use V1 (public) or V2 (authenticated) endpoints

## 🔐 Authentication

### V1 Endpoints (Public)
- ✅ No authentication required
- ❌ No user tracking (`createdBy`/`updatedBy` will be `null`)

### V2 Endpoints (Authenticated)
- 🔑 Requires valid access token
- ✅ Automatic user tracking (`createdBy`/`updatedBy` populated with current user)
- 🔄 Auto-refresh tokens when expired

## 📁 Collection Structure

### 1. 🔐 Setup Authentication
- **User Login** - Get access + refresh tokens for V2 endpoints

### 2. 📋 V1 Issues (Public)
- **Get All Issues** - Retrieve all issues (no auth)
- **Create Issue** - Create new issue (no user tracking)
- **Get Issue by ID** - Retrieve specific issue
- **Update Issue** - Modify existing issue (no user tracking)

### 3. 🔒 V2 Issues (Authenticated)
- **Get All Issues (Auth)** - Retrieve all issues (with auth)
- **Create Issue (With User Tracking)** - Create issue with automatic `createdBy`/`updatedBy`
- **Get Issue by ID (Auth)** - Retrieve specific issue (with auth)
- **Update Issue (With updatedBy Tracking)** - Modify issue with automatic `updatedBy` update

### 4. 🧪 Test Scenarios
- **V2 Without Token (401)** - Test authentication requirement
- **Invalid Issue ID (404)** - Test error handling
- **Invalid Issue Data (400)** - Test validation

### 5. 🧹 Cleanup
- **Clear Variables** - Reset all stored tokens and IDs

## 🔧 Collection Variables

| Variable | Purpose | Auto-managed |
|----------|---------|--------------|
| `baseUrl` | API host | ❌ Manual |
| `V_1` | v1 API prefix (`/api/v1`) | ❌ Manual |
| `V_2` | v2 API prefix (`/api/v2`) | ❌ Manual |
| `issueId` | Created issue ID | ✅ Auto |
| `accessToken` | Authentication token | ✅ Auto |
| `refreshToken` | Token refresh | ✅ Auto |
| `testEmail` | Login email | ❌ Manual |
| `testPassword` | Login password | ❌ Manual |

## 📊 Key Features

### 🎯 User Tracking (V2 Only)
```json
// V2 Create Response
{
  "id": 1,
  "name": "Test Issue",
  "category": "Bug",
  "createdById": 1,    // ✅ Auto-populated
  "updatedById": 1,    // ✅ Auto-populated
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

```json
// V1 Create Response  
{
  "id": 1,
  "name": "Test Issue",
  "category": "Bug",
  "createdById": null, // ❌ No tracking
  "updatedById": null, // ❌ No tracking
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 🔄 Automatic Token Management
- Auto-detects token expiry
- Automatically refreshes tokens
- Seamless authentication handling

### ✅ Comprehensive Testing
- Status code validation
- Response structure checks
- User tracking verification
- Error scenario testing

## 🎬 Recommended Workflow

1. **Setup**: Run "🔐 Setup Authentication" first
2. **V1 Testing**: Test public endpoints (no user tracking)
3. **V2 Testing**: Test authenticated endpoints (with user tracking)
4. **Error Testing**: Run "🧪 Test Scenarios"
5. **Cleanup**: Run "🧹 Cleanup" when done

## 🧪 Test Scenarios Explained

### ✅ Success Cases
- **Public API**: All endpoints work without authentication
- **Authenticated API**: All endpoints work with proper tokens
- **User Tracking**: `createdBy`/`updatedBy` fields populated correctly

### ❌ Error Cases
- **401 Unauthorized**: V2 endpoints without token
- **404 Not Found**: Invalid issue IDs
- **400 Bad Request**: Missing required fields

## 🔍 Response Validation

Each request includes tests for:

```javascript
// Status validation
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

// User tracking validation (V2 only)
pm.test('createdBy/updatedBy populated', function () {
    const responseJson = pm.response.json();
    pm.expect(responseJson.createdById).to.not.be.null;
    pm.expect(responseJson.updatedById).to.not.be.null;
});

// Data structure validation
pm.test('Required fields present', function () {
    const responseJson = pm.response.json();
    pm.expect(responseJson).to.have.property('name');
    pm.expect(responseJson).to.have.property('category');
});
```

## 🛠️ Environment Setup

```json
{
  "baseUrl": "http://localhost:3001",
  "V_1": "/api/v1", 
  "V_2": "/api/v2",
  "testEmail": "your-test@email.com",
  "testPassword": "YourSecurePassword123!"
}
```

## 🚦 API Endpoints Summary

| Method | V1 Endpoint | V2 Endpoint | Auth Required | User Tracking |
|--------|-------------|-------------|---------------|---------------|
| GET | `/api/v1/issues` | `/api/v2/issues` | V2 Only | V2 Only |
| GET | `/api/v1/issues/:id` | `/api/v2/issues/:id` | V2 Only | V2 Only |
| POST | `/api/v1/issues` | `/api/v2/issues` | V2 Only | V2 Only |
| PATCH | `/api/v1/issues/:id` | `/api/v2/issues/:id` | V2 Only | V2 Only |

## 🐛 Troubleshooting

### Common Issues

1. **401 on V2 endpoints**
   - Run login request first
   - Check token auto-refresh in console

2. **createdBy/updatedBy null in V2**
   - Verify authentication token is valid
   - Check user exists in database

3. **Tests failing**
   - Verify environment variables are set
   - Check API server is running
   - Review console logs for errors

### Debug Tips
- Enable Postman Console (`View > Show Postman Console`)
- Check pre-request script logs
- Verify token refresh attempts
- Monitor auto-refresh behavior 
# 📋 Postman Collection: Issue API

## 🚀 Quick Start

1. **Import Collection**: Import `Issue_API.postman_collection.json`
2. **Set Environment**: Configure your base URL (default: `http://localhost:3001`)
3. **Get Auth Token**: Run "🔐 Setup Authentication" → "User Login" to get tokens
4. **Test APIs**: Use authenticated endpoints

## 🔐 Authentication

### Authenticated Endpoints
- 🔑 Requires valid access token
- ✅ Automatic user tracking (`createdBy`/`updatedBy` populated with current user)
- 🔄 Auto-refresh tokens when expired

## 📁 Collection Structure

### 1. 🔐 Setup Authentication
- **User Login** - Get access + refresh tokens

### 2. 🔒 Issues (Authenticated)
- **Get All Issues (Auth)** - Retrieve all issues (with auth)
- **Create Issue (With User Tracking)** - Create issue with automatic `createdBy`/`updatedBy`
- **Get Issue by ID (Auth)** - Retrieve specific issue (with auth)
- **Update Issue (With updatedBy Tracking)** - Modify issue with automatic `updatedBy` update

### 3. 🧪 Test Scenarios
- **Without Token (401)** - Test authentication requirement
- **Invalid Issue ID (404)** - Test error handling
- **Invalid Issue Data (400)** - Test validation

### 4. 🧹 Cleanup
- **Clear Variables** - Reset all stored tokens and IDs

## 🔧 Collection Variables

| Variable | Purpose | Auto-managed |
|----------|---------|--------------|
| `baseUrl` | API host | ❌ Manual |
| `issueId` | Created issue ID | ✅ Auto |
| `accessToken` | Authentication token | ✅ Auto |
| `refreshToken` | Token refresh | ✅ Auto |
| `testEmail` | Login email | ❌ Manual |
| `testPassword` | Login password | ❌ Manual |

## 📊 Key Features

### 🎯 User Tracking
```json
// Create Response
{
  "id": 1,
  "name": "Test Issue",
  "createdById": 1,    // ✅ Auto-populated
  "updatedById": 1,    // ✅ Auto-populated
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
2. **Testing**: Test authenticated endpoints (with user tracking)
3. **Error Testing**: Run "🧪 Test Scenarios"
4. **Cleanup**: Run "🧹 Cleanup" when done

## 🧪 Test Scenarios Explained

### ✅ Success Cases
- **Authenticated API**: All endpoints work with proper tokens
- **User Tracking**: `createdBy`/`updatedBy` fields populated correctly

### ❌ Error Cases
- **401 Unauthorized**: Endpoints without token
- **404 Not Found**: Invalid issue IDs
- **400 Bad Request**: Missing required fields

## 🔍 Response Validation

Each request includes tests for:

```javascript
// Status validation
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

// User tracking validation
pm.test('createdBy/updatedBy populated', function () {
    const responseJson = pm.response.json();
    pm.expect(responseJson.createdById).to.not.be.null;
    pm.expect(responseJson.updatedById).to.not.be.null;
});

// Data structure validation
pm.test('Required fields present', function () {
    const responseJson = pm.response.json();
    pm.expect(responseJson).to.have.property('name');
    pm.expect(responseJson).to.not.have.property('category');
});
```

Issue create and update payloads no longer accept `category`, and issue category
filtering has been removed. Read responses include `categorySummary`, derived
from distinct linked results. To correct a category, update
`analysisFeedbackCategory` on the result; feedback takes precedence over the AI
`analysisCategory`.

## 🛠️ Environment Setup

```json
{
  "baseUrl": "http://localhost:3001",
  "testEmail": "your-test@email.com",
  "testPassword": "YourSecurePassword123!"
}
```

## 🚦 API Endpoints Summary

| Method | Endpoint | Auth Required | User Tracking |
|--------|----------|---------------|---------------|
| GET | `/api/issues` | Yes | Yes |
| GET | `/api/issues/:id` | Yes | Yes |
| POST | `/api/issues` | Yes | Yes |
| PATCH | `/api/issues/:id` | Yes | Yes |

## 🐛 Troubleshooting

### Common Issues

1. **401 on endpoints**
   - Run login request first
   - Check token auto-refresh in console

2. **createdBy/updatedBy null**
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

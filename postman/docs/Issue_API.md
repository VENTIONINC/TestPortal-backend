# 📋 Postman Collection: Issue API

## 🚀 Quick Start

1. **Import Collection**: Import `Issue_API.postman_collection.json`
2. **Set Environment**: Configure your base URL (default: `http://localhost:3001`)
3. **Get Auth Token**: Run "🔐 Setup Authentication" → "User Login" to get tokens
4. **Test APIs**: Use authenticated endpoints with serialized schema responses

## 🔐 Authentication & Schema

### Authenticated Endpoints (Serialized Schema)
- 🔑 Requires valid access token
- 📊 Returns serialized schema with complete user objects (`createdBy`, `updatedBy`)
- ✅ Complete user information in single API call
- 🔄 Auto-refresh tokens when expired
- 🛡️ Security-conscious: excludes sensitive fields like `passwordHash`

## 📁 Collection Structure

### 1. 🔐 Setup Authentication
- **User Login** - Get access + refresh tokens

### 2. 🔒 Issues (Authenticated - Serialized Schema)
- **Get All Issues (Serialized with Users)** - Retrieve all issues with complete user objects
- **Get All Issues with Stats (Serialized with Users)** - Retrieve all issues with statistics and complete user objects
- **Create Issue (With User Tracking)** - Create issue with automatic user tracking
- **Get Issue by ID (Serialized with Users)** - Retrieve specific issue with user objects
- **Update Issue (With updatedBy Tracking)** - Modify issue with automatic `updatedBy` update
- **Test Query Parameters** - Test pagination with serialized responses

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

## 📊 Response Schema Examples

### 🎯 Response (Serialized Schema)

#### Get All Issues
```json
{
  "issues": [
    {
      "id": 1,
      "name": "Database Performance Issue",
      "category": "Bug",
      "description": "Query taking too long",
      "portal": "main-portal", 
      "service": "database-service",
      "ticket": "TICKET-123",
      "status": "Open",
      "createdBy": {           // ✅ Complete user object
        "id": 1,
        "name": "John Doe",
        "email": "john.doe@example.com",
        "createdAt": "2023-12-01T00:00:00.000Z"
        // 🛡️ passwordHash excluded for security
      },
      "updatedBy": {           // ✅ Complete user object  
        "id": 2,
        "name": "Jane Smith",
        "email": "jane.smith@example.com",
        "createdAt": "2023-12-02T00:00:00.000Z"
        // 🛡️ passwordHash excluded for security
      },
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T15:30:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "totalPages": 1
}
```

#### Get All Issues with Stats
```json
{
  "issues": [
    {
      "id": 1,
      "name": "Database Performance Issue",
      "category": "Bug",
      "description": "Query taking too long",
      "portal": "main-portal",
      "service": "database-service",
      "ticket": "TICKET-123",
      "status": "Open",
      "createdBy": {
        "id": 1,
        "name": "John Doe",
        "email": "john.doe@example.com",
        "createdAt": "2023-12-01T00:00:00.000Z"
      },
      "updatedBy": {
        "id": 2,
        "name": "Jane Smith",
        "email": "jane.smith@example.com",
        "createdAt": "2023-12-02T00:00:00.000Z"
      },
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T15:30:00.000Z",
      "statistics": {
        "occurrenceCount": 10,
        "firstOccurrence": "2024-01-01T10:00:00.000Z",
        "lastOccurrence": "2024-01-10T10:00:00.000Z",
        "impactedTestsCount": 5,
        "timeDistribution": [
          {
            "date": "2024-01-01",
            "count": 2
          },
          {
            "date": "2024-01-02",
            "count": 8
          }
        ]
      }
    }
  ],
  "total": 1,
  "page": 1,
  "totalPages": 1
}
```

#### Get Single Issue
```json
{
  "id": 1,
  "name": "Database Performance Issue",
  "category": "Bug",
  "description": "Query taking too long", 
  "portal": "main-portal",
  "service": "database-service",
  "ticket": "TICKET-123",
  "status": "Open",
  "createdBy": {             // ✅ Complete user object
    "id": 1,
    "name": "John Doe", 
    "email": "john.doe@example.com",
    "createdAt": "2023-12-01T00:00:00.000Z"
    // 🛡️ passwordHash excluded for security
  },
  "updatedBy": {             // ✅ Complete user object
    "id": 2,
    "name": "Jane Smith",
    "email": "jane.smith@example.com", 
    "createdAt": "2023-12-02T00:00:00.000Z"
    // 🛡️ passwordHash excluded for security
  },
  "createdAt": "2024-01-01T10:00:00.000Z",
  "updatedAt": "2024-01-01T15:30:00.000Z"
}
```

### 🔄 Create/Update Responses
```json
// Note: Create and Update endpoints return raw schema
{
  "id": 1,
  "name": "New Issue",
  "category": "Feature",
  "description": "New feature request",
  "portal": "test-portal",
  "service": "api-service", 
  "ticket": "TICKET-456",
  "status": "Open",
  "createdById": 1,        // Raw ID format
  "updatedById": 1,        // Raw ID format
  "createdAt": "2024-01-01T10:00:00.000Z",
  "updatedAt": "2024-01-01T10:00:00.000Z"
}
```

## 📊 Key Benefits of Serialized Schema

### ✅ Client Benefits
- **Single API Call**: Get complete user information without additional requests
- **Better UX**: Display user names and emails immediately
- **Reduced Complexity**: No need to manage user ID → user object mapping
- **Future-Proof**: Client code decoupled from database schema changes

### ✅ Performance Benefits
- **Fewer API Calls**: No N+1 query problems on client side
- **Reduced Latency**: Single request vs multiple requests
- **Better Caching**: Complete objects can be cached effectively

### ✅ Security Benefits
- **Selective Serialization**: Sensitive fields like `passwordHash` excluded
- **Controlled Exposure**: Only safe user fields exposed in API responses

## 🔄 Automatic Token Management
- Auto-detects token expiry
- Automatically refreshes tokens  
- Seamless authentication handling

## ✅ Comprehensive Testing

### Schema Validation 
```javascript
pm.test('Has serialized schema with user objects', function () {
    const issue = responseJson.issues[0];
    pm.expect(issue).to.have.property('createdBy');
    pm.expect(issue).to.have.property('updatedBy');
    
    if (issue.createdBy) {
        pm.expect(issue.createdBy).to.have.property('id');
        pm.expect(issue.createdBy).to.have.property('name');
        pm.expect(issue.createdBy).to.have.property('email');
        // Security check
        pm.expect(issue.createdBy).to.not.have.property('passwordHash');
    }
});
```

## 🎬 Recommended Workflow

1. **Setup**: Run "🔐 Setup Authentication" first
2. **Testing**: Test authenticated endpoints with serialized schema
3. **Error Testing**: Run "🧪 Test Scenarios"
4. **Cleanup**: Run "🧹 Cleanup" when done

## 🧪 Test Scenarios Explained

### ✅ Success Cases
- **Serialized Schema**: All endpoints work with proper tokens, return user objects
- **Security**: Password fields properly excluded from responses
- **Pagination**: Works correctly with query parameters

### ❌ Error Cases
- **401 Unauthorized**: Endpoints without token
- **404 Not Found**: Invalid issue IDs
- **400 Bad Request**: Missing required fields

## 🛠️ Environment Setup

```json
{
  "baseUrl": "http://localhost:3001",
  "testEmail": "your-test@email.com",
  "testPassword": "YourSecurePassword123!"
}
```

## 🚦 API Endpoints Summary

| Method | Endpoint | Auth Required | Response Schema |
|--------|----------|---------------|-----------------|
| GET | `/api/issues` | Yes | Serialized User Objects |
| GET | `/api/issues/:id` | Yes | Serialized User Objects |
| POST | `/api/issues` | Yes | Raw IDs (with tracking) |
| PATCH | `/api/issues/:id` | Yes | Raw IDs (with tracking) |

## 🔍 Usage Guide

### For Frontend Developers

#### API Usage (Serialized Schema)
```javascript
// Complete data in single call
const issues = await fetch('/api/issues', {
  headers: { Authorization: `Bearer ${token}` }
}).then(r => r.json());

// User information immediately available
issues.issues.forEach(issue => {
  console.log(`Created by: ${issue.createdBy?.name}`);
  console.log(`Updated by: ${issue.updatedBy?.name}`);
});
```

## 🐛 Troubleshooting

### Common Issues

1. **401 on endpoints**
   - Run login request first
   - Check token auto-refresh in console

2. **Missing user objects**
   - Verify authentication token is valid
   - Check that issues have associated users

3. **Tests failing**
   - Verify environment variables are set
   - Check API server is running
   - Review console logs for errors

### Debug Tips
- Enable Postman Console (`View > Show Postman Console`)
- Check pre-request script logs
- Verify token refresh attempts
- Monitor auto-refresh behavior 
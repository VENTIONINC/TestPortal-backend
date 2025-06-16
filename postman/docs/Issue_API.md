# 📋 Postman Collection: Issue API

## 🚀 Quick Start

1. **Import Collection**: Import `Issue_API.postman_collection.json`
2. **Set Environment**: Configure your base URL (default: `http://localhost:3001`)
3. **Get Auth Token**: Run "🔐 Setup Authentication" → "User Login" to get tokens
4. **Test APIs**: Use V1 (raw schema) or V2 (serialized schema) endpoints

## 🔐 Authentication & Schema Differences

### V1 Endpoints (Public - Raw DB Schema)
- ✅ No authentication required
- 📊 Returns raw database schema (`createdById`, `updatedById` as numbers/null)
- ❌ No user information included - requires additional API calls for user details

### V2 Endpoints (Authenticated - Serialized Schema)
- 🔑 Requires valid access token
- 📊 Returns serialized schema with complete user objects (`createdBy`, `updatedBy`)
- ✅ Complete user information in single API call
- 🔄 Auto-refresh tokens when expired
- 🛡️ Security-conscious: excludes sensitive fields like `passwordHash`

## 📁 Collection Structure

### 1. 🔐 Setup Authentication
- **User Login** - Get access + refresh tokens for V2 endpoints

### 2. 📋 V1 Issues (Public - Raw DB Schema)
- **Get All Issues (Raw)** - Retrieve all issues with raw DB schema
- **Create Issue (Public - Raw Response)** - Create new issue, returns raw schema
- **Get Issue by ID (Raw Schema)** - Retrieve specific issue with ID fields only
- **Update Issue (Public - Raw Response)** - Modify existing issue, returns raw schema

### 3. 🔒 V2 Issues (Authenticated - Serialized Schema)
- **Get All Issues (Serialized with Users)** - Retrieve all issues with complete user objects
- **Create Issue (With User Tracking)** - Create issue with automatic user tracking
- **Get Issue by ID (Serialized with Users)** - Retrieve specific issue with user objects
- **Update Issue (With updatedBy Tracking)** - Modify issue with automatic `updatedBy` update
- **Test V2 Query Parameters** - Test pagination with serialized responses

### 4. 🧪 Test Scenarios
- **V2 Without Token (401)** - Test authentication requirement
- **Invalid Issue ID (404)** - Test error handling
- **Invalid Issue Data (400)** - Test validation
- **Schema Comparison Test** - Demonstrates differences between V1 and V2

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

## 📊 Schema Differences & Examples

### 🎯 V1 Response (Raw DB Schema)

#### Get All Issues V1
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
      "createdById": 1,        // ❌ Just an ID - requires additional API call
      "updatedById": 2,        // ❌ Just an ID - requires additional API call
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T15:30:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "totalPages": 1
}
```

#### Get Single Issue V1
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
  "createdById": 1,        // ❌ Just an ID - requires additional API call
  "updatedById": 2,        // ❌ Just an ID - requires additional API call  
  "createdAt": "2024-01-01T10:00:00.000Z",
  "updatedAt": "2024-01-01T15:30:00.000Z"
}
```

### 🎯 V2 Response (Serialized Schema)

#### Get All Issues V2
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

#### Get Single Issue V2
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

### 🔄 Create/Update Responses (Both V1 & V2)
```json
// Note: Create and Update endpoints still return raw schema for both V1 and V2
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

## 📊 Key Benefits of V2 Serialized Schema

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

### V1 Schema Validation
```javascript
pm.test('V1 has raw DB schema (IDs only)', function () {
    const issue = responseJson.issues[0];
    pm.expect(issue).to.have.property('createdById');
    pm.expect(issue).to.have.property('updatedById');
    pm.expect(issue).to.not.have.property('createdBy');
    pm.expect(issue).to.not.have.property('updatedBy');
});
```

### V2 Schema Validation 
```javascript
pm.test('V2 has serialized schema with user objects', function () {
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
2. **V1 Testing**: Test public endpoints with raw schema
3. **V2 Testing**: Test authenticated endpoints with serialized schema
4. **Schema Comparison**: Compare responses between V1 and V2
5. **Error Testing**: Run "🧪 Test Scenarios"
6. **Cleanup**: Run "🧹 Cleanup" when done

## 🧪 Test Scenarios Explained

### ✅ Success Cases
- **V1 Raw Schema**: All endpoints work without authentication, return IDs only
- **V2 Serialized Schema**: All endpoints work with proper tokens, return user objects
- **Security**: Password fields properly excluded from V2 responses
- **Pagination**: Both schemas work correctly with query parameters

### ❌ Error Cases
- **401 Unauthorized**: V2 endpoints without token
- **404 Not Found**: Invalid issue IDs  
- **400 Bad Request**: Missing required fields

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

| Method | V1 Endpoint | V2 Endpoint | Auth Required | Response Schema |
|--------|-------------|-------------|---------------|-----------------|
| GET | `/api/v1/issues` | `/api/v2/issues` | V2 Only | V1: Raw IDs / V2: User Objects |
| GET | `/api/v1/issues/:id` | `/api/v2/issues/:id` | V2 Only | V1: Raw IDs / V2: User Objects |
| POST | `/api/v1/issues` | `/api/v2/issues` | V2 Only | Both: Raw IDs (tracking in V2) |
| PATCH | `/api/v1/issues/:id` | `/api/v2/issues/:id` | V2 Only | Both: Raw IDs (tracking in V2) |

## 🔍 Schema Migration Guide

### For Frontend Developers

#### V1 Usage (Raw Schema)
```javascript
// V1: Manual user fetching required
const issues = await fetch('/api/v1/issues').then(r => r.json());
const usersNeeded = [...new Set([
  ...issues.issues.map(i => i.createdById),
  ...issues.issues.map(i => i.updatedById)
].filter(Boolean))];

// Additional API calls needed
const users = await Promise.all(
  usersNeeded.map(id => fetch(`/api/v1/users/${id}`).then(r => r.json()))
);
```

#### V2 Usage (Serialized Schema)  
```javascript
// V2: Complete data in single call
const issues = await fetch('/api/v2/issues', {
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

1. **401 on V2 endpoints**
   - Run login request first
   - Check token auto-refresh in console

2. **Missing user objects in V2**
   - Verify authentication token is valid
   - Check that issues have associated users

3. **Schema confusion**
   - V1 = Raw DB schema with IDs
   - V2 = Serialized schema with user objects
   - Create/Update always return raw schema

4. **Tests failing**
   - Verify environment variables are set
   - Check API server is running  
   - Review console logs for errors

### Debug Tips
- Enable Postman Console (`View > Show Postman Console`)
- Check pre-request script logs
- Verify token refresh attempts
- Compare V1 vs V2 response structures
- Monitor auto-refresh behavior 
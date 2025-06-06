# 📮 Test Portal API - Postman Collections

## 🚀 Quick Start

1. **Import Collections**: Import the collections you need from this folder
2. **Set Environment**: Configure your base URL (default: `http://localhost:3001`)
3. **Run Authentication**: Get tokens before testing protected endpoints
4. **Execute Tests**: Use collection runner for automated testing

## 📁 Available Collections

### 1. 👤 User API (`User_API.postman_collection.json`)
Complete user management with authentication:
- User signup and login
- JWT token management with auto-refresh
- Password updates and user profiles
- Comprehensive security testing

**Documentation**: See `docs/User_API.md`

### 2. 📋 Issue API (`Issue_API.postman_collection.json`)
Issue management with user tracking:
- V1 (public) and V2 (authenticated) endpoints
- Automatic createdBy/updatedBy tracking
- CRUD operations for issues
- Error handling and validation

**Documentation**: See `docs/Issue_API.md`

## 🔧 Environment Setup

Create a Postman environment with these variables:

```json
{
  "baseUrl": "http://localhost:3001",
  "V_1": "/api/v1",
  "V_2": "/api/v2",
  "testEmail": "test@example.com",
  "testPassword": "SecurePassword123!"
}
```

## 🔐 Authentication Flow

All collections use the same authentication pattern:

1. **Login** → Get `accessToken` + `refreshToken`
2. **Auto-refresh** → Tokens renewed automatically when expired
3. **Bearer Auth** → Collection-level authentication configured

## 🎯 Recommended Testing Workflow

### For New API Development:
1. **User API First** - Set up authentication
2. **Feature APIs** - Test your specific endpoints
3. **Integration Testing** - Run all collections together

### For CI/CD Pipelines:
```bash
# Run all collections via Newman
newman run User_API.postman_collection.json -e environment.json
newman run Issue_API.postman_collection.json -e environment.json
```

## 🧪 Testing Standards

All collections follow these standards:

### ✅ **Test Structure**
- Status code validation
- Response schema validation  
- Business logic verification
- Error scenario coverage

### 🔄 **Auto-Management**
- Token refresh automation
- Variable auto-population
- Cleanup procedures

### 📊 **Reporting**
- Comprehensive test assertions
- Clear error messages
- Performance timing

## 🛠️ Collection Development Guidelines

When creating new collections:

### 📋 **Naming Convention**
- Collections: `{Feature}_API.postman_collection.json`
- Documentation: `docs/{Feature}_API.md`
- Folders: Use emojis + descriptive names

### 🔧 **Required Variables**
```javascript
// Standard variables for all collections
{
  "baseUrl": "http://localhost:3001",
  "V_1": "/api/v1", 
  "V_2": "/api/v2",
  "accessToken": "",
  "refreshToken": ""
}
```

### 🧪 **Required Test Folders**
1. **🔐 Authentication** - Login/token setup
2. **✅ Happy Path** - Success scenarios  
3. **❌ Error Cases** - Failure scenarios
4. **🧹 Cleanup** - Reset state

## 🚦 API Versioning Strategy

### V1 APIs (Public)
- No authentication required
- Basic functionality
- Backward compatibility focus

### V2 APIs (Authenticated)  
- JWT token required
- Enhanced features (user tracking, etc.)
- Latest functionality

## 📈 Performance Testing

Use collection runner for performance testing:

```javascript
// Performance test template
pm.test('Response time < 200ms', function () {
    pm.expect(pm.response.responseTime).to.be.below(200);
});
```

## 🐛 Troubleshooting

### Common Issues

1. **Collections not working**
   - Verify API server is running
   - Check environment variables
   - Ensure proper import

2. **Authentication failures**
   - Run User API login first
   - Check token expiration
   - Verify auto-refresh logs

3. **Test failures**
   - Check API server logs
   - Verify test data setup
   - Review collection dependencies

### Debug Tools
- **Postman Console**: `View > Show Postman Console`
- **Collection Variables**: Monitor token state
- **Pre-request Scripts**: Check auto-refresh behavior

## 📚 Additional Resources

- **API Documentation**: `/docs` folder
- **Server Setup**: See main project README
- **Database Schema**: Check Prisma schema
- **Environment Config**: See `.env.example`

## 🔄 Updates & Maintenance

This folder is automatically updated when:
- New API endpoints are added
- Authentication changes
- Response schemas evolve

**Last Updated**: Auto-generated with API changes 
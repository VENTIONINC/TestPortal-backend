# 🚀 Getting Started - Test Portal API Collections

## 📦 Quick Import

1. **Import Environment**: `Test_Portal_Environment.postman_environment.json`
2. **Import Collections**:
   - `User_API.postman_collection.json`
   - `Issue_API.postman_collection.json`

## ⚡ 5-Minute Setup

### 1. Environment Configuration
Set your environment variables:
```json
{
  "baseUrl": "http://localhost:3001",
  "testEmail": "your-test@email.com", 
  "testPassword": "YourPassword123!"
}
```

### 2. Authentication Setup
Run in this order:
1. **User API** → **🔐 Authentication** → **✅ User Signup**
2. **User API** → **🔐 Authentication** → **✅ User Login**

✅ **You're now ready to test!** Tokens will auto-refresh.

### 3. Test Your APIs
- **User API**: User management and authentication
- **Issue API**: Issue CRUD with user tracking (V1 public, V2 authenticated)

## 🎯 Common Workflows

### New Feature Development
```
1. User Login → Get tokens
2. Test new endpoints
3. Verify error cases
4. Check user tracking (V2 only)
```

### CI/CD Integration
```bash
newman run User_API.postman_collection.json -e environment.json
newman run Issue_API.postman_collection.json -e environment.json
```

## 📚 Need Help?

- **User API**: See `docs/User_API.md`
- **Issue API**: See `docs/Issue_API.md`
- **Overview**: See `README.md`

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Errors | Run User Login first |
| Token Issues | Check Postman Console logs |
| Tests Failing | Verify API server is running |

**Happy Testing!** 🎉 
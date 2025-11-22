# Users Route Test Documentation

This directory contains tests for the users route (`/api/v2/users/*`). Tests are organized by purpose and responsibility.

## Test File Organization

### 1. `users-auth.test.ts` - **Basic Authentication Flow**
**Purpose**: Tests the core authentication workflow
**Scope**: 
- Signup → Login → Protected access flow
- Basic happy path testing
- Simple integration test

**What it tests**:
- Complete auth flow works end-to-end
- Tokens are issued correctly
- Protected routes require authentication

---

### 2. `users-all-routes.test.ts` - **Comprehensive Route Testing**
**Purpose**: Tests all individual endpoints thoroughly
**Scope**:
- Each endpoint individually (POST signup, POST login, GET profile, PATCH update, POST refresh)
- Happy path scenarios for all operations
- Basic error cases for each endpoint

**What it tests**:
- All 5 user endpoints work correctly
- Request/response formats are correct
- Basic parameter validation

---

### 3. `users-update-refresh.test.ts` - **Advanced Authentication Features**
**Purpose**: Tests token refresh and user update functionality
**Scope**:
- Token refresh mechanism
- User profile updates
- Authentication state management

**What it tests**:
- Refresh token flow works
- User data can be updated
- Authentication persists across operations

---

### 4. `users-business-logic.test.ts` - **Business Logic & Security**
**Purpose**: Tests business requirements, validation, and security
**Scope**:
- Input validation rules
- Database error handling
- Security requirements (password exposure, authentication)
- Data integrity
- Complete user lifecycle

**What it tests**:
- All business rules are enforced
- Security requirements are met
- Error handling works correctly
- Edge cases and data validation

## Test Relationship Matrix

| Test File | Basic Auth | Route Testing | Error Handling | Security | Validation |
|-----------|------------|---------------|----------------|----------|------------|
| `users-auth.test.ts` | ✅ Primary | ➖ | ➖ | ➖ | ➖ |
| `users-all-routes.test.ts` | ✅ Supporting | ✅ Primary | ➖ | ➖ | ➖ |
| `users-update-refresh.test.ts` | ✅ Supporting | ✅ Supporting | ➖ | ➖ | ➖ |
| `users-business-logic.test.ts` | ✅ Supporting | ➖ | ✅ Primary | ✅ Primary | ✅ Primary |

## Running Tests

```bash
# Run all user tests
npm test -- --testPathPattern=users

# Run specific test file
npm test -- src/routes/__tests__/users-auth.test.ts

# Run with coverage
npm test -- --testPathPattern=users --coverage
```

## Coverage Goals

- **Functional Coverage**: All endpoints and operations work
- **Business Logic Coverage**: All validation rules and requirements tested
- **Security Coverage**: No sensitive data exposure, proper authentication
- **Error Coverage**: All error scenarios handled gracefully

## What Each Test Validates

### Authentication & Authorization
- Users can sign up with valid data
- Users can log in with correct credentials
- Protected routes require valid tokens
- Tokens can be refreshed

### Data Security
- Password hashes never exposed in responses
- Authentication headers properly validated
- Unauthorized access properly blocked

### Input Validation
- Required fields are enforced
- Empty/null data is rejected
- Malformed requests handled gracefully

### Error Handling
- Database errors properly handled
- Service errors return appropriate status codes
- Error messages are informative but secure

### Business Requirements
- Complete user lifecycle works
- Data updates persist correctly
- Authentication state managed properly 
# Route Tests Documentation

This directory contains integration tests for the API routes. Tests are organized to match the `src/routes` structure.

## Test File Organization

### 1. `users.test.ts`
**Corresponding Source**: `src/routes/users.ts`
**Purpose**: Comprehensive testing of the `/api/v2/users/*` endpoints.
**Structure**:
- **Authentication Flow**: Tests the core signup → login → protected access workflow.
- **Route Endpoints**: Tests individual endpoints (POST signup, POST login, GET profile, PATCH update, POST refresh).
- **Update & Refresh**: Tests token refresh and user update functionality.
- **Business Logic & Validation**: Tests input validation, error handling, and security requirements.

### 2. `issue.test.ts`
**Corresponding Source**: `src/routes/issue.ts`
**Purpose**: Testing of the `/api/v2/issues/*` endpoints.
**Scope**:
- Authentication requirements for issue creation.
- User context setting (createdById, updatedById).

### 3. `status.test.ts`
**Corresponding Source**: `src/routes/status.ts`
**Purpose**: Health check endpoint testing.

## Running Tests

```bash
# Run all route tests
npm test -- routes

# Run specific test file
npm test -- users.test.ts
```
